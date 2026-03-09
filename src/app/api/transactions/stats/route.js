import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import Pump from '@/lib/models/Pump';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const matchFilter = { createdAt: { $gte: todayStart } };
  if (user.role === 'pump' && user.pumpId) matchFilter.pumpId = user.pumpId;

  const [totals, byClass, recent, pumpStats] = await Promise.all([
    Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          validCount: { $sum: { $cond: [{ $eq: ['$status', 'valid'] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          totalFuel: { $sum: { $cond: [{ $eq: ['$status', 'valid'] }, '$amountLiters', 0] } },
          uniqueVehicles: { $addToSet: '$vehicleReg' },
        }
      }
    ]),
    Transaction.aggregate([
      { $match: { ...matchFilter, status: 'valid' } },
      { $group: { _id: '$vehicleClass', total: { $sum: '$amountLiters' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]),
    Transaction.find(matchFilter).sort({ createdAt: -1 }).limit(10),
    Pump.find().lean(),
  ]);

  const t = totals[0] || {};
  return NextResponse.json({
    totalTransactions: t.totalTransactions || 0,
    validCount: t.validCount || 0,
    rejectedCount: t.rejectedCount || 0,
    totalFuelDispensed: parseFloat((t.totalFuel || 0).toFixed(2)),
    uniqueVehicles: (t.uniqueVehicles || []).length,
    activePumps: pumpStats.filter(p => p.status === 'online').length,
    totalPumps: pumpStats.length,
    byClass,
    recentTransactions: recent,
  });
}
