import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const user = await requireAuth(request, ['govt']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  await connectDB();
  const employees = await User.find().populate('pumpId', 'name').select('-password').sort({ createdAt: 1 });
  return NextResponse.json({ employees });
}

export async function POST(request) {
  const user = await requireAuth(request, ['govt']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  await connectDB();

  const { username, password, name, role, pumpId } = await request.json();
  if (!username || !password || !name || !role) {
    return NextResponse.json({ error: 'username, password, name, role required' }, { status: 400 });
  }

  const exists = await User.findOne({ username });
  if (exists) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

  const emp = await User.create({ username, password, name, role, pumpId: pumpId || null });
  return NextResponse.json({ employee: emp.toSafeObject() }, { status: 201 });
}
