import fs from 'fs';
import https from 'https';
import { getCatalog, reloadCatalogFromDisk, upsertProduct, CatalogProduct } from './catalogService';
import { getStock, StockInfo } from './stockService';
import { getDataFilePath, atomicWriteJson, isServerlessEnvironment } from '../utils/dataPath';

export interface MonitorAlert {
  id: string;
  type: 'NEW_PRODUCT' | 'PRICE_CHANGE' | 'STOCK_UNAVAILABLE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  sku: string;
  productName: string;
  category?: string;
  createdAt: string;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  details: {
    // For Price Changes
    oldPrice?: number;
    newPrice?: number;
    oldMrp?: number;
    newMrp?: number;
    priceDiff?: number;
    mrpDiff?: number;
    // For Stock Unavailability
    previousStockStatus?: string;
    currentStockStatus?: string;
    stockLevel?: number | null;
    stockLabel?: string;
    // For New Products
    price?: number;
    mrp?: number;
    savings?: number;
    discountPercent?: number;
    inStock?: boolean;
    size?: string;
    imageUrl?: string;
    officialUrl?: string;
    slug?: string;
  };
}

export interface MonitorSettings {
  enabled: boolean;
  intervalMinutes: number; // default 30 mins
  autoSyncStock: boolean;
  autoSyncPrices: boolean;
  notifyOnNewProducts: boolean;
}

export interface MonitorData {
  lastScanTimestamp: string | null;
  nextScanTimestamp: string | null;
  isScanning: boolean;
  lastScanDurationMs: number;
  totalProductsChecked: number;
  settings: MonitorSettings;
  alerts: MonitorAlert[];
}

function getMonitorFilePath(): string {
  return getDataFilePath('amway_monitor_alerts.json');
}
function getOfficialDetailsFilePath(): string {
  return getDataFilePath('official_amway_details.json');
}

const DEFAULT_SETTINGS: MonitorSettings = {
  enabled: true,
  intervalMinutes: 30,
  autoSyncStock: false,
  autoSyncPrices: false,
  notifyOnNewProducts: true,
};

let memoryData: MonitorData = {
  lastScanTimestamp: null,
  nextScanTimestamp: null,
  isScanning: false,
  lastScanDurationMs: 0,
  totalProductsChecked: 0,
  settings: DEFAULT_SETTINGS,
  alerts: [],
};

// Load monitor state from disk
export function loadMonitorData(forceReload = false): MonitorData {
  if (!forceReload && memoryData.lastScanTimestamp && memoryData.alerts.length > 0) {
    const hasLegacy = memoryData.alerts.some((a) => a.type === 'NEW_PRODUCT' && !a.details?.price && !a.details?.imageUrl);
    if (!hasLegacy) {
      return memoryData;
    }
  }

  try {
    const monitorFile = getMonitorFilePath();
    if (fs.existsSync(monitorFile)) {
      const raw = fs.readFileSync(monitorFile, 'utf-8');
      const parsed = JSON.parse(raw);
      // Clean up legacy sitemap alerts that lack price or image
      const cleanedAlerts = (parsed.alerts || []).filter((a: any) => {
        if (a.type === 'NEW_PRODUCT' && (!a.details?.price && !a.details?.imageUrl)) {
          return false;
        }
        return true;
      });
      memoryData = {
        ...memoryData,
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        alerts: cleanedAlerts,
      };
    }
  } catch (err) {
    console.error('[MonitorService] Error reading monitor file:', err);
  }

  return memoryData;
}

// Persist monitor state to disk
export function saveMonitorData() {
  try {
    const monitorFile = getMonitorFilePath();
    atomicWriteJson(monitorFile, memoryData);
  } catch (err: any) {
    if (err?.code !== 'EROFS' && err?.code !== 'EACCES') {
      console.warn('[MonitorService] Note: monitor state write deferred:', err?.message || err);
    }
  }
}

// Fetch helper with timeout and User-Agent
function fetchHttpsText(url: string, timeoutMs = 12000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

const AMWAY_STORE_CATEGORY_URLS = [
  { url: 'https://www.amway.in/shop/c/nutrition-supplement', category: 'Nutritional' },
  { url: 'https://www.amway.in/nutrition-supplement/c/protein-supplement', category: 'Protein Powders' },
  { url: 'https://www.amway.in/nutrition-supplement/c/health-supplements', category: 'Daily Supplements' },
  { url: 'https://www.amway.in/nutrition-supplement/c/weight-management', category: 'Weight Management' },
  { url: 'https://www.amway.in/nutrition-supplement/c/nutrilite-traditional-herbs-range', category: 'Traditional Herbs' },
  { url: 'https://www.amway.in/nutrition-supplement/c/omega-3-supplement', category: 'Daily Supplements' },
  { url: 'https://www.amway.in/nutrition-supplement/c/multivitamin-and-multimineral-supplement', category: 'Daily Supplements' },
  { url: 'https://www.amway.in/nutrition-supplement/c/kids-nutrition', category: 'Nutritional' },
  { url: 'https://www.amway.in/beauty/c/skin-care', category: 'Beauty & Skincare' },
  { url: 'https://www.amway.in/personal-care/c/oral-care', category: 'Personal Care' },
  { url: 'https://www.amway.in/personal-care/c/hair-care', category: 'Personal Care' },
  { url: 'https://www.amway.in/home-and-living/c/home-care', category: 'Home & Living' },
];

export const KNOWN_AMWAY_REDIRECTS: Record<string, string> = {
  // Discontinued / Alternate codes that redirect to existing catalog items
  '312357ID': '329159ID', // Weight Management Shake Mix Vanilla -> 329159ID in catalog
  '329877ID': '342574ID', // Ashwagandha -> 342574ID in catalog
  '329873ID': '342573ID', // Ginseng Cherry Plus -> 342573ID in catalog
  '313491ID': '342573ID', // Ginseng Cherry Plus -> 342573ID in catalog
  '329888ID': '342575ID', // Brahmi -> 342575ID in catalog
  '329884ID': '342576ID', // CH Balance -> 342576ID in catalog
  '313511ID': '342576ID', // CH Balance -> 342576ID in catalog
  '300864ID': '342567ID', // Love Your Bones Gummy -> 342567ID in catalog
  '329859ID': '342567ID', // Love Your Bones Gummy -> 342567ID in catalog
  '313503ID': '329889ID', // Multi Carotene -> 329889ID in catalog
  '313502ID': '329871ID', // Milk Thistle Plus -> 329871ID in catalog
  '313488ID': '329879ID', // Concentrated Fruits & Veg -> 329879ID in catalog
  '313520ID': '342578ID', // Vasaka -> 342578ID in catalog
  '313490ID': '342572ID', // I Candy Gummy -> 342572ID in catalog
  '313497ID': '329883ID', // Kids Acerola C -> 329883ID in catalog
  '316167ID': '329868ID', // Cherry Iron -> 329868ID in catalog
  '329892ID': '100066ID', // Salmon Omega 3 -> 100066ID in catalog
  '323327ID': '329861ID', // All Plant Protein limited pack -> 329861ID in catalog
  // Internal duplicates among non-catalog items:
  '313546ID': '329919ID', // Classic Family Toothbrush
  '312233ID': '329927ID', // Multi-Action Toothpaste Herbals
  '313533ID': '329923ID', // Advanced Toothbrush
  '308501ID': '329900ID', // Scalp Tonic
  '313550ID': '329900ID', // Scalp Tonic
  '308512ID': '329905ID', // Revitalizing Hair Mask
  '296556ID': '329950ID', // Insta Nourish Creamy Face Wash
  '296559ID': '329952ID', // Insta Nourish Gel Face Wash
  '313456ID': '329952ID', // Insta Nourish Gel Face Wash
  '308420ID': '329940ID', // Be Bright Face Wash
  '123781ID': '329931ID', // Skin Nutrition Cleanser
  '308422ID': '329941ID', // Be Bright Night Cream
  '313457ID': '329953ID', // Insta Nourish Rich Cream
  '313453ID': '329949ID', // Be Bright Scrub & Mask
  '313541ID': '329920ID', // Amla Hair Oil
  '313547ID': '329913ID', // 2-in-1 Shampoo & Conditioner
  '313548ID': '329902ID', // Anti Dandruff Shampoo
  '308508ID': '330106ID', // Glossy Repair Conditioner
};

export function getSignificantTokens(str: string): string[] {
  const stopWords = new Set([
    'nutrilite', 'amway', 'n by nutrilite', 'artistry', 'essentials', 'by',
    'glister', 'satinique', 'persona', 'and', 'for', 'the', 'with', 'plus', 'pack',
    'limited', 'edition', 'nutritious', 'delicious', 'tablets', 'capsules',
    'softgels', 'gummy', 'gummies', 'units', 'free'
  ]);
  return (str || '')
    .toLowerCase()
    .replace(/[®™©()]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));
}

export function normalizeProductName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\b(nutrilite|amway|n by nutrilite|artistry|essentials by artistry|glister|satinique|persona|limited edition pack)\b/gi, '')
    .replace(/[®™©]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface LiveWebsiteProduct {
  code: string;
  name: string;
  size: string;
  price: number;
  mrp: number;
  savings: number;
  discountPercent: number;
  inStock: boolean;
  stockLevel: number | null;
  stockLabel: string;
  image: string;
  category: string;
  url: string;
}

/**
 * Fetch active products currently listed on the Amway India official website store pages
 */
export async function fetchLiveAmwayWebsiteProducts(): Promise<LiveWebsiteProduct[]> {
  const map = new Map<string, LiveWebsiteProduct>();

  for (const cat of AMWAY_STORE_CATEGORY_URLS) {
    try {
      const html = await fetchHttpsText(cat.url, 10000);
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (!match) continue;

      const nextData = JSON.parse(match[1]);
      const prods = nextData.props?.initialStateOrStore?.PLPState?.categoryData?.products || [];

      for (const p of prods) {
        if (!p.code || map.has(p.code)) continue;

        const price = p.price?.value ? Math.round(p.price.value) : 0;
        const mrp = p.retailPrice?.value ? Math.round(p.retailPrice.value) : price;
        const savings = Math.max(0, mrp - price);
        const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

        const isOutOfStock =
          Boolean(p.isOutOfStock) ||
          Boolean(p.isOOS) ||
          p.purchasable === false ||
          p.stock?.stockLevelStatus === 'outOfStock' ||
          p.stock?.stockLevel === 0;
        const inStock = !isOutOfStock;
        const stockLevel = p.stock?.stockLevel ?? null;
        const stockLabel = !inStock
          ? 'Out of Stock'
          : stockLevel !== null && stockLevel < 50
            ? `Low Stock (${stockLevel} left)`
            : 'In Stock';

        const image =
          p.images?.find((img: any) => img.format === 'product' || img.format === 'tablet')?.url ||
          p.images?.[0]?.url ||
          'https://placehold.co/400x400/F0FDFA/0F766E?text=Amway';

        map.set(p.code, {
          code: p.code,
          name: p.name,
          size: p.amwaySize || 'Standard Pack',
          price,
          mrp,
          savings,
          discountPercent,
          inStock,
          stockLevel,
          stockLabel,
          image,
          category: cat.category,
          url: p.url ? `https://www.amway.in${p.url}` : `https://www.amway.in/nutrilite/p/${p.code}`,
        });
      }
    } catch (e: any) {
      console.error(`[MonitorService] Error fetching category ${cat.url}:`, e.message);
    }
  }

  return Array.from(map.values());
}

/**
 * Fetch PDP details from Amway official site
 */
export async function fetchAmwayPdp(sku: string): Promise<{
  sku: string;
  name?: string;
  price?: number;
  retailPrice?: number;
  stockStatus?: string;
  stockLevel?: number | null;
  image?: string;
  description?: string;
  success: boolean;
}> {
  const url = `https://www.amway.in/nutrilite/p/${sku}`;
  try {
    const html = await fetchHttpsText(url, 12000);

    let name: string | undefined;
    let price: number | undefined;
    let retailPrice: number | undefined;
    let stockStatus: string | undefined;
    let stockLevel: number | null = null;
    let image: string | undefined;
    let description: string | undefined;

    // 1. Extract from __NEXT_DATA__ or productData if available
    const prodIdx = html.indexOf('"productData":{');
    if (prodIdx !== -1) {
      const sub = html.substring(prodIdx);
      const nameMatch = sub.match(/"name":"([^"]+)"/);
      if (nameMatch) name = nameMatch[1];

      const priceMatch = sub.match(/"price":\{[^}]*"value":([\d.]+)/);
      if (priceMatch) price = Math.round(parseFloat(priceMatch[1]));

      const retailMatch = sub.match(/"retailPrice":\{[^}]*"value":([\d.]+)/);
      if (retailMatch) retailPrice = Math.round(parseFloat(retailMatch[1]));

      const stockStatusMatch = sub.match(/"stockLevelStatus":"([^"]+)"/);
      if (stockStatusMatch) stockStatus = stockStatusMatch[1];

      const stockLevelMatch = sub.match(/"stockLevel":(\d+)/);
      if (stockLevelMatch) stockLevel = parseInt(stockLevelMatch[1], 10);

      const imgMatch = sub.match(/"url":"(https:\/\/media\.amway\.in\/sys-master\/images\/[^"]+)"/);
      if (imgMatch) image = imgMatch[1];
    }

    // 2. Fallbacks using meta tags / OpenGraph
    if (!name) {
      const titleMatch = html.match(/<title>([^<|]+)/i);
      if (titleMatch) name = titleMatch[1].trim();
    }
    if (!stockStatus) {
      const availMatch = html.match(/property="og:availability"\s+content="([^"]+)"/i);
      if (availMatch) stockStatus = availMatch[1];
    }
    if (!image) {
      const ogImgMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
      if (ogImgMatch) image = ogImgMatch[1];
    }

    return {
      sku,
      name,
      price,
      retailPrice,
      stockStatus: stockStatus || 'inStock',
      stockLevel,
      image,
      description,
      success: true,
    };
  } catch (err: any) {
    return {
      sku,
      success: false,
    };
  }
}

/**
 * Execute a complete monitor check across all categories:
 * 1. Checks for new products added to Amway official website
 * 2. Identifies price changes against current catalog
 * 3. Identifies stock unavailability against warehouse
 */
export async function runMonitorCheck(): Promise<MonitorData> {
  loadMonitorData();
  if (memoryData.isScanning) {
    return memoryData;
  }

  memoryData.isScanning = true;
  saveMonitorData();

  const startTime = Date.now();
  console.log('[MonitorService] 🚀 Starting scheduled Amway official scan...');

  try {
    const catalog = getCatalog();
    const existingSkuSet = new Set<string>();
    const existingNormalizedNames = new Set<string>();

    for (const p of catalog) {
      if (p.sku) existingSkuSet.add(p.sku.toLowerCase().trim());
      if (p.id) existingSkuSet.add(p.id.toLowerCase().trim());
      const norm = normalizeProductName(p.name);
      if (norm.length > 2) existingNormalizedNames.add(norm);

      if (p.variants) {
        for (const v of p.variants) {
          if (v.sku) existingSkuSet.add(v.sku.toLowerCase().trim());
          if (v.weight) {
            const vNorm = normalizeProductName(`${p.name} ${v.weight}`);
            if (vNorm.length > 2) existingNormalizedNames.add(vNorm);
          }
        }
      }
    }

    // Load official cached details as reference
    let officialAmwayData: Record<string, any> = {};
    const officialDetailsPath = getOfficialDetailsFilePath();
    if (fs.existsSync(officialDetailsPath)) {
      try {
        officialAmwayData = JSON.parse(fs.readFileSync(officialDetailsPath, 'utf-8'));
      } catch (e) {}
    }

    // Keep non-dismissed alerts (skip old NEW_PRODUCT alerts so stale sitemap items are cleaned up)
    const pendingAlertsMap = new Map<string, MonitorAlert>();
    for (const a of memoryData.alerts) {
      if (a.status === 'PENDING' && a.type !== 'NEW_PRODUCT') {
        pendingAlertsMap.set(`${a.type}_${a.sku}`, a);
      }
    }

    // =========================================================================
    // STEP 1: CHECK FOR ACTIVE PRODUCTS LISTED ON AMWAY OFFICIAL WEBSITE
    // =========================================================================
    console.log('[MonitorService] Step 1: Checking Amway website categories for live products...');
    const liveWebsiteProducts = await fetchLiveAmwayWebsiteProducts();
    const seenScrapedNames = new Map<string, string>();
    const KNOWN_OUT_OF_STOCK_SKUS = new Set(['202387ID', '202388ID', '341524ID', '341525ID']);

    for (const item of liveWebsiteProducts) {
      // 1. Resolve to active SKU if known redirect or superseded code
      const activeSku = KNOWN_AMWAY_REDIRECTS[item.code] || item.code;
      const lowerSku = activeSku.toLowerCase().trim();

      // 2. Check if active SKU or scraped code is already in our catalog
      if (existingSkuSet.has(lowerSku) || existingSkuSet.has(item.code.toLowerCase().trim())) {
        continue;
      }

      // 3. Significant token coverage matching against all catalog products
      const aTokens = getSignificantTokens(item.name);
      let isCatalogMatch = false;

      for (const p of catalog) {
        const cTokens = getSignificantTokens(p.name);
        if (cTokens.length === 0) continue;

        const shared = cTokens.filter((t) => aTokens.includes(t));
        const cCoverage = shared.length / cTokens.length;

        // Flavor checks (Vanilla vs Chocolate vs Coffee)
        const flavors = ['vanilla', 'chocolate', 'coffee', 'orange', 'cherry', 'strawberry', 'lemon', 'mango'];
        const aFlavors = flavors.filter((f) => aTokens.includes(f));
        const cFlavors = flavors.filter((f) => cTokens.includes(f));
        if (aFlavors.length > 0 && cFlavors.length > 0 && aFlavors[0] !== cFlavors[0]) {
          continue;
        }

        if (cCoverage >= 0.70) {
          isCatalogMatch = true;
          break;
        }
      }

      if (isCatalogMatch) {
        continue;
      }

      // 4. Deduplicate among scraped products itself (avoid repeated entries for same product)
      const normTokens = aTokens.join(' ');
      if (seenScrapedNames.has(normTokens) || seenScrapedNames.has(activeSku.toLowerCase())) {
        continue;
      }
      seenScrapedNames.set(normTokens, activeSku);
      seenScrapedNames.set(activeSku.toLowerCase(), activeSku);

      const alertKey = `NEW_PRODUCT_${activeSku}`;
      const existingAlert = pendingAlertsMap.get(alertKey);

      const inStock = !KNOWN_OUT_OF_STOCK_SKUS.has(activeSku) && item.inStock;
      const stockLevel = item.stockLevel;
      const stockLabel = !inStock
        ? 'Out of Stock'
        : stockLevel !== null && stockLevel < 50
        ? `Low Stock (${stockLevel} left)`
        : 'In Stock';

      const newAlert: MonitorAlert = {
        id: existingAlert?.id || `alert_new_${activeSku}_${Date.now()}`,
        type: 'NEW_PRODUCT',
        severity: inStock ? 'INFO' : 'WARNING',
        sku: activeSku,
        productName: item.name,
        category: item.category,
        createdAt: existingAlert?.createdAt || new Date().toISOString(),
        status: 'PENDING',
        details: {
          price: item.price,
          mrp: item.mrp,
          savings: item.savings,
          discountPercent: item.discountPercent,
          inStock,
          stockLevel,
          stockLabel,
          imageUrl: item.image,
          size: item.size,
          officialUrl: `https://www.amway.in/nutrilite/p/${activeSku}`,
        },
      };
      pendingAlertsMap.set(alertKey, newAlert);
    }

    // =========================================================================
    // STEP 2 & 3: CHECK PRICE CHANGES & STOCK UNAVAILABILITY
    // =========================================================================
    console.log('[MonitorService] Step 2 & 3: Checking catalog products for price & stock updates...');

    // Sample or check active products in batches
    const productsToCheck = catalog.slice(0, 44); // Check up to full catalog
    let checkedCount = 0;

    for (const p of productsToCheck) {
      const sku = p.sku || p.id;
      if (!sku) continue;

      // 1. Stock check
      const stockInfo: StockInfo = await getStock(sku, true); // force live fetch
      checkedCount++;

      if (stockInfo.status === 'OUT_OF_STOCK' || stockInfo.status === 'LOW_STOCK') {
        const alertKey = `STOCK_UNAVAILABLE_${sku}`;
        const existingAlert = pendingAlertsMap.get(alertKey);
        if (!existingAlert) {
          const stockAlert: MonitorAlert = {
            id: `alert_stock_${sku}_${Date.now()}`,
            type: 'STOCK_UNAVAILABLE',
            severity: stockInfo.status === 'OUT_OF_STOCK' ? 'CRITICAL' : 'WARNING',
            sku,
            productName: p.name,
            category: p.category || p.parentCategory,
            createdAt: new Date().toISOString(),
            status: 'PENDING',
            details: {
              previousStockStatus: 'IN_STOCK',
              currentStockStatus: stockInfo.status,
              stockLevel: stockInfo.stockLevel,
              stockLabel: stockInfo.label,
            },
          };
          pendingAlertsMap.set(alertKey, stockAlert);
        }
      }

      // 2. Price check against official data
      const officialItem = officialAmwayData[sku];
      if (officialItem && officialItem.price && officialItem.price > 0) {
        const officialPrice = officialItem.price;
        const officialMrp = officialItem.retailPrice || officialItem.mrp || p.mrp;

        const priceDifference = officialPrice - p.price;
        const mrpDifference = officialMrp - p.mrp;

        // If there's a discrepancy between our catalog price and Amway official price
        if (Math.abs(priceDifference) > 0 || Math.abs(mrpDifference) > 0) {
          const alertKey = `PRICE_CHANGE_${sku}`;
          if (!pendingAlertsMap.has(alertKey)) {
            const priceAlert: MonitorAlert = {
              id: `alert_price_${sku}_${Date.now()}`,
              type: 'PRICE_CHANGE',
              severity: 'WARNING',
              sku,
              productName: p.name,
              category: p.category || p.parentCategory,
              createdAt: new Date().toISOString(),
              status: 'PENDING',
              details: {
                oldPrice: p.price,
                newPrice: officialPrice,
                oldMrp: p.mrp,
                newMrp: officialMrp,
                priceDiff: priceDifference,
                mrpDiff: mrpDifference,
              },
            };
            pendingAlertsMap.set(alertKey, priceAlert);
          }
        }
      }

      // Small throttle to be courteous to servers
      if (checkedCount % 5 === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    const duration = Date.now() - startTime;
    const now = new Date();
    const nextScan = new Date(now.getTime() + memoryData.settings.intervalMinutes * 60 * 1000);

    memoryData.isScanning = false;
    memoryData.lastScanTimestamp = now.toISOString();
    memoryData.nextScanTimestamp = nextScan.toISOString();
    memoryData.lastScanDurationMs = duration;
    memoryData.totalProductsChecked = checkedCount;
    memoryData.alerts = Array.from(pendingAlertsMap.values());

    saveMonitorData();
    console.log(
      `[MonitorService] ✅ Scan completed in ${duration}ms! Found ${memoryData.alerts.length} active alerts.`
    );
  } catch (err: any) {
    console.error('[MonitorService] Scan error:', err);
    memoryData.isScanning = false;
    saveMonitorData();
  }

  return memoryData;
}

/**
 * Apply alert action (e.g. Update Price, Update Stock, or Import New Product)
 */
export async function applyAlertAction(alertId: string): Promise<{ success: boolean; message: string }> {
  loadMonitorData();
  const alertIdx = memoryData.alerts.findIndex((a) => a.id === alertId);
  if (alertIdx === -1) {
    return { success: false, message: 'Alert not found' };
  }

  const alert = memoryData.alerts[alertIdx];

  try {
    if (alert.type === 'PRICE_CHANGE' && alert.details.newPrice) {
      // Update catalog product price & MRP
      const catalog = getCatalog();
      const existing = catalog.find(
        (p) => p.sku?.toLowerCase() === alert.sku.toLowerCase() || p.id?.toLowerCase() === alert.sku.toLowerCase()
      );
      if (existing) {
        const newPrice = alert.details.newPrice;
        const newMrp = alert.details.newMrp || alert.details.oldMrp || existing.mrp;
        upsertProduct({
          ...existing,
          price: newPrice,
          mrp: newMrp,
          savings: Math.max(0, newMrp - newPrice),
          priceString: `MRP: ₹${newMrp} | Direct Selling Price: ₹${newPrice}`,
        });
      }
      alert.status = 'APPLIED';
      saveMonitorData();
      return {
        success: true,
        message: `Successfully updated price for ${alert.productName} to ₹${alert.details.newPrice}`,
      };
    }

    if (alert.type === 'STOCK_UNAVAILABLE') {
      // Stock update is acknowledged
      alert.status = 'APPLIED';
      saveMonitorData();
      return {
        success: true,
        message: `Acknowledged stock status for ${alert.productName}`,
      };
    }

    if (alert.type === 'NEW_PRODUCT') {
      alert.status = 'APPLIED';
      saveMonitorData();
      return {
        success: true,
        message: `Acknowledged alert for ${alert.productName}. You can add it manually to your catalog with verified category and price.`,
      };
    }

    return { success: false, message: 'Unsupported alert action' };
  } catch (err: any) {
    return { success: false, message: `Failed to apply action: ${err.message}` };
  }
}

/**
 * Apply all alerts of a specific type (Price changes or Stock updates)
 */
export async function applyAllAlertsOfType(type: 'PRICE_CHANGE' | 'STOCK_UNAVAILABLE') {
  loadMonitorData();
  if (type !== 'PRICE_CHANGE' && type !== 'STOCK_UNAVAILABLE') {
    return { success: false, count: 0 };
  }
  const targetAlerts = memoryData.alerts.filter((a) => a.type === type && a.status === 'PENDING');
  let appliedCount = 0;

  for (const a of targetAlerts) {
    const res = await applyAlertAction(a.id);
    if (res.success) appliedCount++;
  }

  return { success: true, count: appliedCount };
}

/**
 * Dismiss an alert
 */
export function dismissAlert(alertId: string) {
  loadMonitorData();
  const alert = memoryData.alerts.find((a) => a.id === alertId);
  if (alert) {
    alert.status = 'DISMISSED';
    saveMonitorData();
    return true;
  }
  return false;
}

/**
 * Dismiss all alerts of a type or all
 */
export function dismissAllAlerts(type?: string) {
  loadMonitorData();
  for (const a of memoryData.alerts) {
    if (!type || a.type === type) {
      a.status = 'DISMISSED';
    }
  }
  saveMonitorData();
  return true;
}

/**
 * Update monitor settings
 */
export function updateMonitorSettings(newSettings: Partial<MonitorSettings>): MonitorSettings {
  loadMonitorData();
  memoryData.settings = { ...memoryData.settings, ...newSettings };
  saveMonitorData();

  // Reset timer interval if running
  if (globalThis.__amway_monitor_timer__) {
    clearInterval(globalThis.__amway_monitor_timer__);
    globalThis.__amway_monitor_timer__ = undefined;
    initMonitorScheduler();
  }

  return memoryData.settings;
}

/**
 * Background Scheduler Singleton
 */
declare global {
  var __amway_monitor_initialized__: boolean | undefined;
  var __amway_monitor_timer__: NodeJS.Timeout | undefined;
}

export function initMonitorScheduler() {
  // In development mode, static build, or serverless environments (Vercel/Lambda), do not run background scrapers
  if (
    isServerlessEnvironment() ||
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return;
  }

  if (globalThis.__amway_monitor_initialized__) {
    return;
  }

  globalThis.__amway_monitor_initialized__ = true;
  console.log('[MonitorService] Initializing scheduled Amway official background monitor...');

  const data = loadMonitorData();
  const intervalMs = Math.max(5, data.settings.intervalMinutes) * 60 * 1000;

  // Run initial check after 8 seconds of server boot
  setTimeout(() => {
    runMonitorCheck().catch((err) => console.error('[MonitorService] Initial check error:', err));
  }, 8000);

  // Set recurring interval
  globalThis.__amway_monitor_timer__ = setInterval(() => {
    const current = loadMonitorData();
    if (current.settings.enabled) {
      runMonitorCheck().catch((err) => console.error('[MonitorService] Scheduled check error:', err));
    }
  }, intervalMs);
}
