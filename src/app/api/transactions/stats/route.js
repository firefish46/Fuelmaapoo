import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import Pump from '@/lib/models/Pump';
import { requireAuth } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();


    const now        = new Date();
    const todayStart = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
      0, 0, 0, 0
    ));

    // Build match filter — cast pumpId to ObjectId if present
    const matchFilter = { createdAt: { $gte: todayStart } };
    if (user.role === 'pump' && user.pumpId) {
      try {
        matchFilter.pumpId = new mongoose.Types.ObjectId(user.pumpId);
      } catch {
        matchFilter.pumpId = user.pumpId;
      }
    }

    console.log('[STATS] matchFilter:', JSON.stringify(matchFilter));

    const [totals, byClass, recent, pumpStats] = await Promise.all([
      Transaction.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            validCount:    { $sum: { $cond: [{ $eq: ['$status', 'valid']    }, 1, 0] } },
            rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            totalFuel:     { $sum: { $cond: [{ $eq: ['$status', 'valid']    }, '$amountLiters', 0] } },
            uniqueVehicles: { $addToSet: '$vehicleReg' },
          }
        }
      ]),
      Transaction.aggregate([
        { $match: { ...matchFilter, status: 'valid' } },
        { $group: { _id: '$vehicleClass', total: { $sum: '$amountLiters' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Transaction.find(matchFilter).sort({ createdAt: -1 }).limit(10).lean(),
      Pump.find().lean(),
    ]);

    console.log('[STATS] totals:', totals, 'recent count:', recent.length);

    const t = totals[0] || {};
    return NextResponse.json({
      totalTransactions:  t.totalTransactions  || 0,
      validCount:         t.validCount         || 0,
      rejectedCount:      t.rejectedCount      || 0,
      totalFuelDispensed: parseFloat((t.totalFuel || 0).toFixed(2)),
      uniqueVehicles:     (t.uniqueVehicles || []).length,
      activePumps:        pumpStats.filter(p => p.status === 'online').length,
      totalPumps:         pumpStats.length,
      byClass,
      recentTransactions: recent,
    });

  } catch (err) {
    console.error('[STATS ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}