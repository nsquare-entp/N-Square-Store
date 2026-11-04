import { NextResponse } from 'next/server';
import { getAllOrders, getOrdersByUserId, createOrder, updateOrder, deleteOrder } from '../../../services/orderService';
import { verifyAdminRequest } from '../../../utils/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const orders = getOrdersByUserId(userId);
      return NextResponse.json({ success: true, orders, count: orders.length });
    }

    if (!verifyAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const orders = getAllOrders();
    return NextResponse.json({ success: true, orders, count: orders.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data.userId || !data.items || !Array.isArray(data.items)) {
      return NextResponse.json({ error: 'User ID and items array are required' }, { status: 400 });
    }

    const newOrder = createOrder(data);
    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const isAdmin = verifyAdminRequest(request);

    // If not admin, only permit confirming receipt (status: 'DELIVERED')
    if (!isAdmin) {
      if (data.status !== 'DELIVERED') {
        return NextResponse.json({ error: 'Unauthorized: Admin authentication required to modify order details.' }, { status: 401 });
      }
      const updated = updateOrder(data.id, {
        status: 'DELIVERED',
        deliveredAt: data.deliveredAt || new Date().toISOString(),
      });
      if (!updated) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, order: updated });
    }

    if (data.discountAmount !== undefined || data.deliveryCharge !== undefined) {
      if (data.discountAmount !== undefined) data.discountAmount = Number(data.discountAmount) || 0;
      if (data.deliveryCharge !== undefined) data.deliveryCharge = Number(data.deliveryCharge) || 0;
    }

    const updated = updateOrder(data.id, data);
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const success = deleteOrder(id);
    if (!success) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Order ${id} deleted` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete order' }, { status: 500 });
  }
}
