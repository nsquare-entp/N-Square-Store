import { NextResponse } from 'next/server';
import {
  getAllAccountRequests,
  getRequestsByUserId,
  createAccountRequest,
  resolveAccountRequest,
} from '../../../services/accountRequestService';
import { verifyAdminRequest } from '../../../utils/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const requests = getRequestsByUserId(userId);
      return NextResponse.json({ success: true, requests, count: requests.length });
    }

    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const requests = getAllAccountRequests();
    return NextResponse.json({ success: true, requests, count: requests.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch account requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data.userId || !data.message || !data.message.trim()) {
      return NextResponse.json(
        { error: 'User ID and details of your request are required.' },
        { status: 400 }
      );
    }

    const newReq = createAccountRequest(data);
    return NextResponse.json({ success: true, request: newReq }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit request' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const { id, status, adminNotes } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Request ID and status are required' }, { status: 400 });
    }

    const updated = resolveAccountRequest(id, status, adminNotes);
    if (!updated) {
      return NextResponse.json({ error: 'Account request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resolve request' }, { status: 500 });
  }
}
