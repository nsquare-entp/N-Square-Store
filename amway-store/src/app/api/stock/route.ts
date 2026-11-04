import { NextResponse } from 'next/server';
import { getStock, bulkSyncStock, getAllStockCached, loadCache } from '../../../services/stockService';
import { getCatalog } from '../../../services/catalogService';
import { verifyAdminRequest } from '../../../utils/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const live = searchParams.get('live') === 'true';

    // 1. Single SKU stock query
    if (sku) {
      const stock = await getStock(sku, live);
      return NextResponse.json({ success: true, stock });
    }

    // 2. All SKUs stock query (instant from in-memory cache, zero external requests)
    const cache = loadCache();
    return NextResponse.json({
      success: true,
      stock: cache.items,
      items: cache.items,
      lastBulkSync: cache.lastBulkSync,
    });
  } catch (err: any) {
    console.error('Error in /api/stock:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const catalog = getCatalog();
    const skus = catalog.map((p) => p.sku || p.id).filter(Boolean);
    const updated = await bulkSyncStock(skus);
    return NextResponse.json({
      success: true,
      message: `Bulk sync triggered for ${skus.length} products`,
      total: skus.length,
      timestamp: new Date().toISOString(),
      updatedCount: Object.keys(updated).length,
    });
  } catch (err: any) {
    console.error('Error in POST /api/stock:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
