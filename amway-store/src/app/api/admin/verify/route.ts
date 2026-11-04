import { NextResponse } from 'next/server';
import { verifyAdminPin, validateSessionToken } from '../../../../services/adminAuthService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Check existing session token
    if (data.token) {
      const isValid = validateSessionToken(data.token);
      if (isValid) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: 'Session expired. Please re-enter 4-digit PIN.' }, { status: 401 });
    }

    // Verify 4-digit PIN
    if (!data.pin || typeof data.pin !== 'string') {
      return NextResponse.json({ success: false, error: 'Please enter a 4-digit PIN' }, { status: 400 });
    }

    const result = verifyAdminPin(data.pin);
    if (!result.valid) {
      return NextResponse.json({ success: false, error: 'Incorrect 4-digit PIN. Access denied.' }, { status: 401 });
    }

    return NextResponse.json({ success: true, token: result.token });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

