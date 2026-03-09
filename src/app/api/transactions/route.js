import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import FuelLimit from '@/lib/models/FuelLimit';
import Pump from '@/lib/models/Pump';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(request.url);

  const filter = {};
  if (user.role === 'pump' && user.pumpId) filter.pumpId = user.pumpId;

  const reg = searchParams.get('reg');
  const vehicleClass = searchParams.get('class');
  const pumpId = searchParams.get('pump');
  const status = searchParams.get('status');
  const date = searchParams.get('date');

  if (reg) filter.vehicleReg = { $regex: reg.toUpperCase(), $options: 'i' };
  if (vehicleClass) filter.vehicleClass = vehicleClass;
  if (pumpId && user.role === 'govt') filter.pumpId = pumpId;
  if (status) filter.status = status;
  if (date) {
    const d = new Date(date);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  }

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return NextResponse.json({ transactions, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const body = await request.json();
  const { vehicleReg, ownerName, vehicleClass, amountLiters, pumpId } = body;

  if (!vehicleReg || !vehicleClass || !amountLiters || !pumpId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Pump operators can only record for their assigned pump
  if (user.role === 'pump' && user.pumpId !== pumpId) {
    return NextResponse.json({ error: 'Not authorized for this pump' }, { status: 403 });
  }

  const pump = await Pump.findById(pumpId);
  if (!pump) return NextResponse.json({ error: 'Pump not found' }, { status: 404 });

  const limitDoc = await FuelLimit.findOne({ vehicleClass });
  if (!limitDoc) return NextResponse.json({ error: 'Vehicle class limit not configured' }, { status: 400 });

  const dailyLimit = limitDoc.dailyLimitLiters;

  // Calculate today's usage
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const todayUsed = await Transaction.aggregate([
    {
      $match: {
        vehicleReg: vehicleReg.toUpperCase(),
        status: 'valid',
        createdAt: { $gte: todayStart, $lte: todayEnd },
      }
    },
    { $group: { _id: null, total: { $sum: '$amountLiters' } } }
  ]);

  const usedToday = todayUsed[0]?.total || 0;
  const remaining = dailyLimit - usedToday;

  let status, rejectionReason;

  if (usedToday >= dailyLimit) {
    status = 'rejected';
    rejectionReason = `Daily limit of ${dailyLimit}L already reached`;
  } else if (amountLiters > remaining) {
    status = 'rejected';
    rejectionReason = `Requested ${amountLiters}L exceeds remaining allowance of ${remaining.toFixed(1)}L`;
  } else {
    status = 'valid';
  }

  const txn = await Transaction.create({
    vehicleReg: vehicleReg.toUpperCase(),
    ownerName: ownerName || 'N/A',
    vehicleClass,
    amountLiters: parseFloat(amountLiters),
    pumpId: pump._id,
    pumpName: pump.name,
    operatorId: user.userId,
    operatorName: user.name,
    status,
    rejectionReason: rejectionReason || null,
    dailyTotalAfter: status === 'valid' ? usedToday + parseFloat(amountLiters) : usedToday,
    dailyLimit,
  });

  return NextResponse.json({ transaction: txn, status, rejectionReason: rejectionReason || null });
}
