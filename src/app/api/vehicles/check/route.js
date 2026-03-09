import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import FuelLimit from '@/lib/models/FuelLimit';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const reg = searchParams.get('reg')?.toUpperCase().trim();
  const vehicleClass = searchParams.get('class');

  if (!reg) return NextResponse.json({ error: 'Registration number required' }, { status: 400 });

  await connectDB();

  // Get today's start and end
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Find today's valid transactions for this vehicle
  const todayTxns = await Transaction.find({
    vehicleReg: reg,
    status: 'valid',
    createdAt: { $gte: todayStart, $lte: todayEnd },
  }).sort({ createdAt: -1 });

  const usedToday = todayTxns.reduce((sum, t) => sum + t.amountLiters, 0);

  // Detect vehicle class from history if not provided
  let detectedClass = vehicleClass;
  if (!detectedClass) {
    const lastTxn = await Transaction.findOne({ vehicleReg: reg }).sort({ createdAt: -1 });
    if (lastTxn) detectedClass = lastTxn.vehicleClass;
  }

  // Get limit
  let limitDoc = null;
  let dailyLimit = null;
  if (detectedClass) {
    limitDoc = await FuelLimit.findOne({ vehicleClass: detectedClass });
    dailyLimit = limitDoc?.dailyLimitLiters ?? null;
  }

  const remaining = dailyLimit !== null ? Math.max(dailyLimit - usedToday, 0) : null;
  const isEligible = dailyLimit !== null ? usedToday < dailyLimit : null;

  // Last 5 transactions
  const history = await Transaction.find({ vehicleReg: reg })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('pumpId', 'name');

  return NextResponse.json({
    vehicleReg: reg,
    detectedClass,
    dailyLimit,
    usedToday: parseFloat(usedToday.toFixed(2)),
    remaining: remaining !== null ? parseFloat(remaining.toFixed(2)) : null,
    isEligible,
    timesServedToday: todayTxns.length,
    history: history.map(t => ({
      id: t._id,
      date: t.createdAt,
      amount: t.amountLiters,
      pump: t.pumpName,
      status: t.status,
      vehicleClass: t.vehicleClass,
    })),
  });
}
