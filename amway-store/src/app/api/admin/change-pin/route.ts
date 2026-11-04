import { NextResponse } from 'next/server';
import { updateAdminPin } from '../../../../services/adminAuthService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { currentPin, newPin } = await request.json();

    if (!currentPin || !newPin) {
      return NextResponse.json({ success: false, error: 'Current PIN and new 4-digit PIN are required.' }, { status: 400 });
    }

    const result = updateAdminPin(currentPin, newPin);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to update PIN.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Admin 4-digit PIN updated successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

