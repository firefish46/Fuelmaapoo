import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import FuelLimit from '@/lib/models/FuelLimit';
import { requireAuth } from '@/lib/auth';
import { normalizeReg } from '@/lib/utils';

export async function GET(request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const reg = normalizeReg(searchParams.get('reg') || '');
  const vehicleClass = searchParams.get('class');

  if (!reg) return NextResponse.json({ error: 'Registration number required' }, { status: 400 });

  await connectDB();

const now        = new Date();
const todayStart = new Date(Date.UTC(
  now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
  0, 0, 0, 0
));
const todayEnd = new Date(Date.UTC(
  now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
  23, 59, 59, 999
));
  // All of today's VALID transactions for this vehicle
  const todayTxns = await Transaction.find({
    vehicleReg: reg,
    status:     'valid',
    createdAt:  { $gte: todayStart, $lte: todayEnd },
  }).sort({ createdAt: -1 });

  const usedToday = todayTxns.reduce((sum, t) => sum + t.amountLiters, 0);

  // Detect vehicle class from history if not provided
  let detectedClass = vehicleClass || null;
  if (!detectedClass) {
    const lastTxn = await Transaction.findOne({ vehicleReg: reg }).sort({ createdAt: -1 });
    if (lastTxn) detectedClass = lastTxn.vehicleClass;
  }

  // Get daily limit for this class
  let dailyLimit = null;
  if (detectedClass) {
    const limitDoc = await FuelLimit.findOne({ vehicleClass: detectedClass });
    dailyLimit = limitDoc?.dailyLimitLiters ?? null;
  }

  const remaining  = dailyLimit !== null ? Math.max(dailyLimit - usedToday, 0) : null;
  const isEligible = dailyLimit !== null ? usedToday < dailyLimit : null;

  // Last 5 transactions (any status)
  const history = await Transaction.find({ vehicleReg: reg })
    .sort({ createdAt: -1 })
    .limit(5);

  console.log(`[CHECK] ${reg} | used=${usedToday} | limit=${dailyLimit} | eligible=${isEligible} | todayTxns=${todayTxns.length}`);

  return NextResponse.json({
    vehicleReg:       reg,
    detectedClass,
    dailyLimit,
    usedToday:        parseFloat(usedToday.toFixed(2)),
    remaining:        remaining !== null ? parseFloat(remaining.toFixed(2)) : null,
    isEligible,
    timesServedToday: todayTxns.length,
    history: history.map(t => ({
      id:           t._id,
      date:         t.createdAt,
      amount:       t.amountLiters,
      pump:         t.pumpName,
      status:       t.status,
      vehicleClass: t.vehicleClass,
    })),
  });
}
