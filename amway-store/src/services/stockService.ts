import fs from 'fs';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';

export interface StockInfo {
  sku: string;
  inStock: boolean;
  stockLevel: number | null;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  label: string;
  lastUpdated: string;
}

interface StockCache {
  lastBulkSync: string | null;
  items: Record<string, StockInfo>;
}

function getCacheFilePath(): string {
  return getDataFilePath('stock_cache.json');
}
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL for live fetch (prevents repeated slow scrapes)
const HOURLY_MS = 60 * 60 * 1000; // 1 hour for scheduled bulk refresh

let memoryCache: StockCache = {
  lastBulkSync: null,
  items: {},
};

// Load initial cache from disk if available
export function loadCache(): StockCache {
  if (Object.keys(memoryCache.items).length > 0) {
    return memoryCache;
  }

  try {
    const cacheFile = getCacheFilePath();
    if (fs.existsSync(cacheFile)) {
      const raw = fs.readFileSync(cacheFile, 'utf-8');
      memoryCache = JSON.parse(raw);
    }
  } catch (err) {
    console.error('[StockService] Error reading cache file:', err);
  }

  return memoryCache;
}

export function getAllStockCached(): Record<string, StockInfo> {
  const cache = loadCache();
  return cache.items || {};
}

// Persist cache to disk
function saveCache() {
  try {
    const cacheFile = getCacheFilePath();
    atomicWriteJson(cacheFile, memoryCache);
  } catch (err) {
    console.error('[StockService] Error saving stock cache file:', err);
  }
}

/**
 * Fetch live stock from Amway India official web with strict 3.5s timeout
 */
export async function fetchLiveStockFromAmway(sku: string): Promise<StockInfo> {
  const url = `https://www.amway.in/nutrilite/p/${sku}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      // Default to In Stock if page cannot be loaded
      const fallback: StockInfo = {
        sku,
        inStock: true,
        stockLevel: null,
        status: 'IN_STOCK',
        label: 'In Stock (Direct Amway Fulfilment)',
        lastUpdated: new Date().toISOString(),
      };
      memoryCache.items[sku] = fallback;
      return fallback;
    }

    const html = await res.text();
    const escapedSku = sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const skuBlockRegex = new RegExp(`"stock":\\{([^}]+)\\}[^}]*"url":"[^"]*${escapedSku}`, 'i');
    const m = html.match(skuBlockRegex);

    let stockLevel: number | null = null;
    let stockStatus = 'inStock';

    if (m) {
      const stockInner = m[1];
      const levelMatch = stockInner.match(/"stockLevel":(\d+)/);
      const statusMatch = stockInner.match(/"stockLevelStatus":"([^"]+)"/);
      if (levelMatch) stockLevel = parseInt(levelMatch[1], 10);
      if (statusMatch) stockStatus = statusMatch[1];
    } else {
      const ogMatch = html.match(/property="og:availability"\s+content="([^"]+)"/i);
      if (ogMatch) {
        stockStatus = ogMatch[1];
      }
    }

    const isAvailable = stockStatus.toLowerCase().includes('instock');
    let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = isAvailable ? 'IN_STOCK' : 'OUT_OF_STOCK';
    let label = isAvailable ? 'In Stock' : 'Temporarily Out of Stock';

    if (isAvailable && stockLevel !== null) {
      if (stockLevel < 50) {
        status = 'LOW_STOCK';
        label = `Only ${stockLevel} left in hub`;
      } else {
        label = 'In Stock';
      }
    }

    const stockInfo: StockInfo = {
      sku,
      inStock: isAvailable,
      stockLevel,
      status,
      label,
      lastUpdated: new Date().toISOString(),
    };

    memoryCache.items[sku] = stockInfo;
    saveCache();
    return stockInfo;
  } catch (err: any) {
    console.error(`[StockService] Live fetch error for ${sku}:`, err.message);
    const fallback: StockInfo = {
      sku,
      inStock: true,
      stockLevel: null,
      status: 'IN_STOCK',
      label: 'In Stock',
      lastUpdated: new Date().toISOString(),
    };
    return fallback;
  }
}

/**
 * Get stock for a SKU (returns cache instantly; only performs live fetch if forceLive is explicitly true)
 */
export async function getStock(sku: string, forceLive = false): Promise<StockInfo> {
  const cache = loadCache();
  const cached = cache.items[sku];

  if (!forceLive) {
    if (cached) return cached;
    // Default safe fallback if SKU not yet in cache
    return {
      sku,
      inStock: true,
      stockLevel: null,
      status: 'IN_STOCK',
      label: 'In Stock',
      lastUpdated: new Date().toISOString(),
    };
  }

  // Live fetch only when explicitly forced (e.g. admin manual sync)
  return fetchLiveStockFromAmway(sku);
}

/**
 * Bulk sync stock availability across list of SKUs
 */
export async function bulkSyncStock(skus: string[]): Promise<Record<string, StockInfo>> {
  console.log(`[StockService] Starting bulk stock sync for ${skus.length} products...`);
  loadCache();

  // Process in small batches of 3 to be gentle with official Amway server
  const batchSize = 3;
  for (let i = 0; i < skus.length; i += batchSize) {
    const batch = skus.slice(i, i + batchSize);
    await Promise.all(batch.map((sku) => fetchLiveStockFromAmway(sku)));
    if (i + batchSize < skus.length) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  memoryCache.lastBulkSync = new Date().toISOString();
  saveCache();
  console.log(`[StockService] Bulk sync completed at ${memoryCache.lastBulkSync}`);
  return memoryCache.items;
}

/**
 * Initialize background cron job (disabled in dev to prevent blocking dev server)
 */
declare global {
  var __stock_scheduler_initialized__: boolean | undefined;
  var __stock_scheduler_timer__: NodeJS.Timeout | undefined;
}

export function initStockScheduler(allSkus: string[]) {
  // In development mode or during static site production build, do not run background scrapers
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  if (globalThis.__stock_scheduler_initialized__) {
    return;
  }

  globalThis.__stock_scheduler_initialized__ = true;
  console.log('[StockService] Initializing hourly stock availability background job...');

  // Run initial sync after delay
  setTimeout(() => {
    bulkSyncStock(allSkus).catch((err) =>
      console.error('[StockService] Initial bulk sync error:', err)
    );
  }, 10000);

  // Set recurring hourly interval
  globalThis.__stock_scheduler_timer__ = setInterval(() => {
    bulkSyncStock(allSkus).catch((err) =>
      console.error('[StockService] Hourly bulk sync error:', err)
    );
  }, HOURLY_MS);
}
