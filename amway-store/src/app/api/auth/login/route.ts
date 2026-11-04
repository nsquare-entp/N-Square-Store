import { NextResponse } from 'next/server';
import { getUserByLoginKey, updateUser } from '../../../../services/userService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { loginKey, password } = await request.json();

    if (!loginKey || !password) {
      return NextResponse.json(
        { error: 'Mobile number/email and password are required.' },
        { status: 400 }
      );
    }

    const user = getUserByLoginKey(loginKey);

    if (!user) {
      return NextResponse.json(
        {
          error:
            'Account not found. Customer accounts are exclusively created and verified by your N-Square Store consultant. Please connect with your consultant to get your account.',
        },
        { status: 401 }
      );
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your account is currently suspended. Please contact your N-Square Store consultant.' },
        { status: 403 }
      );
    }

    if (user.password !== password.trim()) {
      return NextResponse.json(
        { error: 'Incorrect password. If you forgot your password, please request assistance from your consultant.' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    const updatedUser = updateUser(user.id, { lastLoginAt: new Date().toISOString() }) || user;

    // Return safe user object (omit raw password)
    const { password: _, ...safeUser } = updatedUser;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
