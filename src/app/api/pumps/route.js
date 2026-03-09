import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Pump from '@/lib/models/Pump';
import Transaction from '@/lib/models/Transaction';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const pumps = await Pump.find().sort({ createdAt: 1 });

  // Add today's totals
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayStats = await Transaction.aggregate([
    { $match: { status: 'valid', createdAt: { $gte: todayStart } } },
    { $group: { _id: '$pumpId', todayTotal: { $sum: '$amountLiters' }, count: { $sum: 1 } } }
  ]);
  const statsMap = {};
  todayStats.forEach(s => { statsMap[s._id.toString()] = s; });

  return NextResponse.json({
    pumps: pumps.map(p => ({
      ...p.toObject(),
      todayTotal: statsMap[p._id.toString()]?.todayTotal || 0,
      todayCount: statsMap[p._id.toString()]?.count || 0,
    }))
  });
}

export async function POST(request) {
  const user = await requireAuth(request, ['govt']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  await connectDB();
  const { name, location } = await request.json();
  if (!name || !location) return NextResponse.json({ error: 'name and location required' }, { status: 400 });
  const pump = await Pump.create({ name, location });
  return NextResponse.json({ pump }, { status: 201 });
}
