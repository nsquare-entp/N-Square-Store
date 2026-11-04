import { NextResponse } from 'next/server';
import { getGlobalCategories, upsertGlobalCategory, deleteGlobalCategory } from '../../../services/categoryService';
import { verifyAdminRequest } from '../../../utils/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = getGlobalCategories();
    return NextResponse.json({ categories, count: categories.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const data = await request.json();
    if (!data.name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    const category = upsertGlobalCategory(data);
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const data = await request.json();
    if (!data.id || !data.name) {
      return NextResponse.json({ error: 'Category id and name are required' }, { status: 400 });
    }
    const category = upsertGlobalCategory(data);
    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    const success = deleteGlobalCategory(id);
    if (!success) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Category ${id} deleted` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete category' }, { status: 500 });
  }
}
