import { NextResponse } from 'next/server';
import { getCatalog, getProductById, searchProducts, upsertProduct, deleteProduct, reloadCatalogFromDisk, syncCatalogFromSupabase } from '../../../services/catalogService';
import { verifyAdminRequest } from '../../../utils/adminAuth';
import { isSupabaseConfigured } from '../../../utils/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // If cache is empty on cold start, initialize from Supabase immediately
    let allProducts = getCatalog();
    if ((!allProducts || allProducts.length === 0) && isSupabaseConfigured) {
      const synced = await syncCatalogFromSupabase();
      if (synced && synced.length > 0) allProducts = synced;
    }

    const { searchParams } = new URL(request.url);
    const reload = searchParams.get('reload') === 'true';

    if (reload) {
      if (!verifyAdminRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
      }
      const all = reloadCatalogFromDisk();
      return NextResponse.json({ success: true, products: all, count: all.length });
    }

    const id = searchParams.get('id');
    const q = searchParams.get('q') || searchParams.get('search');
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

    if (id) {
      const product = getProductById(id);
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json({ product });
    }

    if (q || category || minPrice !== undefined || maxPrice !== undefined || limit) {
      const filtered = searchProducts({
        query: q || undefined,
        category: category || undefined,
        minPrice,
        maxPrice,
        limit,
      });
      return NextResponse.json(
        { products: filtered, count: filtered.length },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          },
        }
      );
    }

    const all = getCatalog();
    return NextResponse.json(
      { products: all, count: all.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    console.error('API /api/products error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const productData = await request.json();
    if (!productData.name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const created = upsertProduct(productData);
    return NextResponse.json({ success: true, product: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const productData = await request.json();
    if (!productData.id && !productData.sku) {
      return NextResponse.json({ error: 'Product id or sku is required for update' }, { status: 400 });
    }

    const updated = upsertProduct(productData);
    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const success = deleteProduct(id);
    if (!success) {
      return NextResponse.json({ error: 'Product not found or already deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Product ${id} deleted successfully` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
