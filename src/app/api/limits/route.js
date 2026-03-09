import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FuelLimit from '@/lib/models/FuelLimit';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const limits = await FuelLimit.find().sort({ vehicleClass: 1 });
  return NextResponse.json({ limits });
}

export async function PUT(request) {
  const user = await requireAuth(request, ['govt']);
  if (!user) return NextResponse.json({ error: 'Unauthorized — Govt admin only' }, { status: 403 });
  await connectDB();

  const { vehicleClass, dailyLimitLiters } = await request.json();
  if (!vehicleClass || dailyLimitLiters === undefined) {
    return NextResponse.json({ error: 'vehicleClass and dailyLimitLiters required' }, { status: 400 });
  }

  const limit = await FuelLimit.findOneAndUpdate(
    { vehicleClass },
    { dailyLimitLiters: parseFloat(dailyLimitLiters), updatedBy: user.userId },
    { new: true, upsert: true }
  );

  return NextResponse.json({ limit });
}
