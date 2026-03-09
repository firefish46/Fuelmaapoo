import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  const user = await requireAuth(request, ['govt']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  await connectDB();
  const body = await request.json();
  // Don't allow password change via this endpoint
  delete body.password;
  const emp = await User.findByIdAndUpdate(params.id, body, { new: true }).select('-password').populate('pumpId', 'name');
  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ employee: emp });
}
