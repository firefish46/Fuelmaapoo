import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import FuelLimit from '@/lib/models/FuelLimit';
import Pump from '@/lib/models/Pump';
import { requireAuth } from '@/lib/auth';
import { validateRegistration } from '@/lib/bdRegistration';
import { haversineKm, checkDistanceAllowance } from '@/lib/distance';

// Simple normalizer — NO stripping, just uppercase + collapse whitespace/dashes
function normalizeReg(reg) {
  if (!reg) return '';
  return reg.toUpperCase().trim().replace(/[-\s]+/g, ' ');
}

export async function GET(request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(request.url);

  const filter = {};
  if (user.role === 'pump' && user.pumpId) filter.pumpId = user.pumpId;

  const reg          = searchParams.get('reg');
  const vehicleClass = searchParams.get('class');
  const pumpId       = searchParams.get('pump');
  const status       = searchParams.get('status');
  const date         = searchParams.get('date');

  if (reg)                            filter.vehicleReg = { $regex: normalizeReg(reg), $options: 'i' };
  if (vehicleClass)                   filter.vehicleClass = vehicleClass;
  if (pumpId && user.role === 'govt') filter.pumpId = pumpId;
  if (status)                         filter.status = status;
  if (date) {
    const d = new Date(date);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    const end   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
    filter.createdAt = { $gte: start, $lte: end };
  }

  const page  = parseInt(searchParams.get('page')  || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip  = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return NextResponse.json({ transactions, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
 
    const body = await request.json();
    const { vehicleReg, ownerName, vehicleClass, amountLiters, pumpId } = body;

    if (!vehicleReg || !vehicleClass || !amountLiters || !pumpId)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    // Fix: compare as strings
    if (user.role === 'pump' && user.pumpId && user.pumpId.toString() !== pumpId.toString())
      return NextResponse.json({ error: 'Not authorized for this pump' }, { status: 403 });

    const pump = await Pump.findById(pumpId);
    if (!pump) return NextResponse.json({ error: 'Pump not found' }, { status: 404 });

    const limitDoc = await FuelLimit.findOne({ vehicleClass });
    if (!limitDoc) return NextResponse.json({ error: `No limit configured for: ${vehicleClass}` }, { status: 400 });

    const dailyLimit = limitDoc.dailyLimitLiters;

    // THE KEY FIX: use same normalizer for both storing and querying
    const cleanReg = normalizeReg(vehicleReg);

    const now        = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // Use find+reduce instead of aggregate to avoid ObjectId casting issues
    const todayTxns = await Transaction.find({
      vehicleReg: cleanReg,
      status:     'valid',
      createdAt:  { $gte: todayStart, $lte: todayEnd },
    }).lean();

    const usedToday       = todayTxns.reduce((sum, t) => sum + t.amountLiters, 0);
    const remaining       = dailyLimit - usedToday;
    const requestedAmount = parseFloat(amountLiters);

    console.log(`[DISPENSE] reg="${cleanReg}" usedToday=${usedToday} limit=${dailyLimit} remaining=${remaining} requested=${requestedAmount} todayTxns=${todayTxns.length}`);

    // Distance allowance
    let distanceAllowance = null;
    const lastTxn = await Transaction.findOne({
      vehicleReg: cleanReg,
      status:     'valid',
      pumpLat:    { $ne: null },
      pumpLng:    { $ne: null },
    }).sort({ createdAt: -1 }).lean();

    if (lastTxn && pump.lat && pump.lng) {
      const distKm = haversineKm(lastTxn.pumpLat, lastTxn.pumpLng, pump.lat, pump.lng);
      distanceAllowance = checkDistanceAllowance({
        distanceKm:     distKm,
        lastFuelLiters: lastTxn.amountLiters,
        vehicleClass,
        usedToday,
        dailyLimit,
      });
    }

    let txnStatus, rejectionReason, effectiveAmount;

    if (usedToday >= dailyLimit) {
      if (distanceAllowance?.allowed) {
        txnStatus       = 'valid';
        effectiveAmount = distanceAllowance.extraLiters
          ? Math.min(requestedAmount, distanceAllowance.extraLiters)
          : Math.min(requestedAmount, dailyLimit * 0.5);
        rejectionReason = null;
      } else {
        txnStatus       = 'rejected';
        rejectionReason = `Daily limit of ${dailyLimit}L already reached today (used: ${usedToday.toFixed(1)}L)`;
        effectiveAmount = 0;
      }
    } else if (requestedAmount > remaining) {
      if (distanceAllowance?.allowed && distanceAllowance.extraLiters) {
        txnStatus       = 'valid';
        effectiveAmount = Math.min(requestedAmount, distanceAllowance.extraLiters);
        rejectionReason = null;
      } else {
        txnStatus       = 'rejected';
        rejectionReason = `Requested ${requestedAmount}L exceeds remaining allowance of ${remaining.toFixed(1)}L`;
        effectiveAmount = 0;
      }
    } else {
      txnStatus       = 'valid';
      effectiveAmount = requestedAmount;
      rejectionReason = null;
    }

    const txn = await Transaction.create({
      vehicleReg:      cleanReg,   // ← always store normalized
      ownerName:       ownerName || 'N/A',
      vehicleClass,
      amountLiters:    effectiveAmount,
      pumpId:          pump._id,
      pumpName:        pump.name,
      pumpLat:         pump.lat  || null,
      pumpLng:         pump.lng  || null,
      operatorId:      user.userId,
      operatorName:    user.name,
      status:          txnStatus,
      rejectionReason: rejectionReason || null,
      dailyTotalAfter: txnStatus === 'valid' ? usedToday + effectiveAmount : usedToday,
      dailyLimit,
    });

    console.log(`[DISPENSE] saved _id=${txn._id} status=${txnStatus} dailyTotalAfter=${txn.dailyTotalAfter}`);

    return NextResponse.json({
      transaction:      txn,
      status:           txnStatus,
      rejectionReason:  rejectionReason || null,
      distanceAllowance,
      effectiveAmount,
    });

  } catch (err) {
    console.error('[DISPENSE ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}