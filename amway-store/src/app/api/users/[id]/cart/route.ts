import { NextResponse } from 'next/server';
import { syncUserCart, getUserById } from '../../../../../services/userService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { cart } = await request.json();

    if (!Array.isArray(cart)) {
      return NextResponse.json({ error: 'Cart must be an array of items' }, { status: 400 });
    }

    const success = syncUserCart(id, cart);
    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = getUserById(id);
    return NextResponse.json({ success: true, cart: updatedUser?.cart || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to sync cart' }, { status: 500 });
  }
}
