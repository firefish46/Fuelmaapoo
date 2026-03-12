import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Pump from '@/lib/models/Pump';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  const user = await requireAuth(request, ['govt']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  await connectDB();
  const body = await request.json();
  const pump = await Pump.findByIdAndUpdate(params.id, body, { new: true });
  if (!pump) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ pump });
}

// GET employees assigned to this pump
export async function GET(request, { params }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const employees = await User.find({ pumpId: params.id, role: 'pump' })
    .select('-password')
    .sort({ createdAt: 1 });
  return NextResponse.json({ employees });
}