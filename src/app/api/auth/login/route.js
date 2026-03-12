import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import '@/lib/models/Pump';
import { signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    const { username, password } = await request.json();

    if (!username || !password)
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });

    // Find user — don't filter by active here, check separately for better error
    const user = await User.findOne({ username: username.trim().toLowerCase() }).populate('pumpId');

    if (!user)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    if (!user.active)
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 401 });

    const valid = await user.comparePassword(password);
    if (!valid)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const pumpIdStr = user.pumpId?._id?.toString() || user.pumpId?.toString() || null;

    const token = await signToken({
      userId:   user._id.toString(),
      username: user.username,
      name:     user.name,
      role:     user.role,
      pumpId:   pumpIdStr,
      pumpName: user.pumpId?.name || null,
    });

    const response = NextResponse.json({
      user: {
        id:       user._id.toString(),
        username: user.username,
        name:     user.name,
        role:     user.role,
        pumpId:   pumpIdStr,
        pumpName: user.pumpId?.name || null,
      }
    });

    response.cookies.set('fuel_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 8,
      path:     '/',   // ← critical: without this cookie won't send on /api/* routes
    });

    return response;
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}