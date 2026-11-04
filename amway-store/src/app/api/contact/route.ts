import { NextResponse } from 'next/server';
import { getContactSettings, updateContactSettings } from '../../../services/contactService';
import { verifyAdminRequest } from '../../../utils/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const contact = getContactSettings();
    return NextResponse.json({ success: true, contact });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch contact settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = updateContactSettings(body);
    return NextResponse.json({ success: true, contact: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update contact settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}

