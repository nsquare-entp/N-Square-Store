import fs from 'fs';
import path from 'path';
import { initStockScheduler } from './stockService';
import { getDataDir, atomicWriteJson } from '../utils/dataPath';

export interface MedicalStandardRow {
  ingredient: string;
  product_measurement: string;
  standard_measurement: string;
  fit_assessment: string;
  rating: 'Good' | 'Moderate' | 'Bad';
}

export interface MedicalValidationRecord {
  standard_authority: string;
  standard_url: string;
  secondary_url?: string;
  verification_table: MedicalStandardRow[];
  who_may_use?: string[];
  who_should_not_use?: string[];
}

export interface ClinicalNutritionRationale {
  what_it_is: string;
  why_it_is_needed: string;
}

export interface OfficialIngredientsData {
  preText?: string;
  specificationTable?: Array<{
    ingredientName: string;
    values: Array<{ name: string; value: string }>;
  }>;
  postText?: string;
}

export interface OfficialProductDetails {
  sku: string;
  officialName?: string;
  price?: number;
  retailPrice?: number;
  stockLevel?: number | null;
  stockStatus?: string;
  detailsHtml?: string;
  featuresHtml?: string;
  benefitsHtml?: string;
  howToUseHtml?: string;
  ingredientsData?: OfficialIngredientsData;
  moreInfoHtml?: string;
  manufacturingDetails?: string;
  faqs?: Array<{ question: string; answer: string }>;
  classifications?: Array<{ name: string; values: string[] }>;
  galleryImages?: string[];
}

export interface ProductVariant {
  id?: string;
  sku: string;
  weight: string;
  price: number;
  mrp: number;
  savings: number;
  discountPercent: number;
  inStock?: boolean;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId: string;
  categoryDescription?: string;
  parentCategory?: string;
  parentCategoryId?: string;
  weight: string;
  pack_sizes: string[];
  variants?: ProductVariant[];
  price: number;
  mrp: number;
  savings: number;
  priceString: string;
  image: string;
  images: string[];
  usp: string;
  clinical_nutrition_rationale?: ClinicalNutritionRationale;
  medical_standards_validation?: MedicalValidationRecord;
  who_may_use?: string[];
  who_should_not_use?: string[];
  totalIngredientsCount: number;
  complianceRating: 'Good' | 'Moderate' | 'Bad';
  officialDetails?: OfficialProductDetails;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  description: string;
  productCount: number;
}

// In-memory catalog cache with write-through capability and persistent global reference
declare global {
  var __nsquare_catalog_cache__: CatalogProduct[] | undefined;
  var __nsquare_category_summaries__: CategorySummary[] | undefined;
}

let categorySummaries: CategorySummary[] = [];

const CATEGORY_FILES = [
  'category1_protein_powders.json',
  'category2_weight_management.json',
  'category3_supplement_tablets_capsules.json',
  'category4_gummies.json',
  'category5_traditional_herbs.json',
];

function parsePriceString(priceStr: string, packSizes?: string[]) {
  if (!priceStr) {
    return { mrp: 0, price: 0, weight: packSizes?.[0] || 'Standard' };
  }

  const mrpMatch = priceStr.match(/MRP:\s*₹?([\d,]+)/i);
  const aboMatch = priceStr.match(/(?:ABO|Direct\s*Selling)\s*Price:\s*₹?([\d,.]+)/i);
  const weightMatch = priceStr.match(/\(([^)]+)\)$/);

  const mrp = mrpMatch ? parseInt(mrpMatch[1].replace(/,/g, ''), 10) : 0;
  const price = aboMatch ? parseFloat(aboMatch[1].replace(/,/g, '')) : mrp;
  const weight = weightMatch ? weightMatch[1].trim() : (packSizes?.[0] || 'Standard');

  return {
    mrp: mrp || price,
    price: price || mrp,
    weight,
  };
}

function resolveProductImages(id: string, primaryUrl?: string): string[] {
  const primary = primaryUrl || `/images/products/${id}.png`;
  const img1 = `/images/products/${id}_1.png`;
  const img2 = `/images/products/${id}_2.png`;
  return [primary, img1, img2];
}

function computeProductCompliance(verificationTable?: MedicalStandardRow[]): 'Good' | 'Moderate' | 'Bad' {
  if (!verificationTable || verificationTable.length === 0) return 'Good';
  const badCount = verificationTable.filter(r => r.rating === 'Bad').length;
  const modCount = verificationTable.filter(r => r.rating === 'Moderate').length;
  if (badCount > 0) return 'Bad';
  if (modCount > verificationTable.length / 2) return 'Moderate';
  return 'Good';
}

function extractCleanSentenceSummary(html: string): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, '•')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= 15) return '';

  // Extract complete sentences while protecting decimal points in numbers (e.g. 23.5, 42.59%)
  const sentences = text.match(/(?:[^.!?]|\b\d+\.\d+\b)+[.!?]+(?:\s+|$)/g) || [text];
  if (sentences && sentences.length > 0) {
    let combined = '';
    for (const s of sentences) {
      const clean = s.trim();
      if (!clean) continue;
      // Accumulate 1 to 2 complete sentences up to ~320 chars
      if ((combined + ' ' + clean).trim().length <= 320 || !combined) {
        combined = combined ? `${combined} ${clean}` : clean;
      } else {
        break;
      }
    }
    if (combined) return combined;
  }
  return text;
}

function extractCleanUsp(official?: OfficialProductDetails, fallback?: string): string {
  if (!official) return fallback || '';
  if (official.benefitsHtml) {
    const s = extractCleanSentenceSummary(official.benefitsHtml);
    if (s) return s;
  }
  if (official.featuresHtml) {
    const s = extractCleanSentenceSummary(official.featuresHtml);
    if (s) return s;
  }
  if (official.detailsHtml) {
    const s = extractCleanSentenceSummary(official.detailsHtml);
    if (s) return s;
  }
  return fallback || '';
}

const KNOWN_VARIANT_MAP: Record<string, ProductVariant[]> = {
  // NUTRILITE® All Plant Protein Powder
  '329861ID': [
    {
      sku: '329878ID',
      weight: '200 g',
      price: 990,
      mrp: 1175,
      savings: 185,
      discountPercent: 16,
    },
    {
      sku: '329867ID',
      weight: '500 g',
      price: 2034,
      mrp: 2460,
      savings: 426,
      discountPercent: 17,
    },
    {
      sku: '329861ID',
      weight: '1 kg',
      price: 3591,
      mrp: 4140,
      savings: 549,
      discountPercent: 13,
    },
  ],
  // NUTRILITE® Daily Plus
  '329862ID': [
    {
      sku: '329863ID',
      weight: '30 Tablets',
      price: 689,
      mrp: 789,
      savings: 100,
      discountPercent: 13,
    },
    {
      sku: '329862ID',
      weight: '120 Tablets',
      price: 2349,
      mrp: 2690,
      savings: 341,
      discountPercent: 13,
    },
  ],
  // NUTRILITE® Daily
  '313504ID': [
    {
      sku: '313505ID',
      weight: '60 Tablets',
      price: 1147,
      mrp: 1289,
      savings: 142,
      discountPercent: 11,
    },
    {
      sku: '313504ID',
      weight: '120 Tablets',
      price: 2048,
      mrp: 2193,
      savings: 145,
      discountPercent: 7,
    },
  ],
};

function loadAllFromDisk(): CatalogProduct[] {
  const loadedProducts: CatalogProduct[] = [];
  const summaries: CategorySummary[] = [];

  const activeDataDir = getDataDir();

  let officialAmwayData: Record<string, OfficialProductDetails> = {};
  const officialDetailsPath = path.join(activeDataDir, 'official_amway_details.json');
  if (fs.existsSync(officialDetailsPath)) {
    try {
      officialAmwayData = JSON.parse(fs.readFileSync(officialDetailsPath, 'utf-8'));
    } catch (e) {
      console.error('Error loading official_amway_details.json:', e);
    }
  }

  for (const filename of CATEGORY_FILES) {
    const fullPath = path.join(activeDataDir, filename);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const json = JSON.parse(content);
      const catId = json.category_id || filename.replace('.json', '');
      const catName = json.category_name || 'Supplements';
      const catDesc = json.category_description || '';
      const rawProducts = json.products || [];

      summaries.push({
        id: catId,
        name: catName,
        description: catDesc,
        productCount: rawProducts.length,
      });

      for (const raw of rawProducts) {
        const id = raw.id || raw.sku;
        const parsed = parsePriceString(raw.price || '', raw.pack_sizes);
        const images = resolveProductImages(id, raw.image_url);
        const vTable = raw.medical_standards_validation?.verification_table || [];
        const whoMayUse = raw.target_audience?.who_may_use || raw.who_may_use || [];
        const whoNotUse = raw.target_audience?.who_should_not_use || raw.who_should_not_use || [];

        const official = officialAmwayData[id] || officialAmwayData[raw.sku];
        const officialUsp = extractCleanUsp(official, raw.usp);
        const allImages = official?.galleryImages && official.galleryImages.length > 0
          ? official.galleryImages
          : images;

        // Resolve or generate quantity variants
        let variants: ProductVariant[] = [];
        if (raw.variants && Array.isArray(raw.variants) && raw.variants.length > 0) {
          variants = raw.variants.map((v: any) => {
            const vPrice = Number(v.price) || 0;
            const vMrp = Number(v.mrp) || vPrice;
            return {
              sku: v.sku || id,
              weight: v.weight || 'Standard',
              price: vPrice,
              mrp: vMrp,
              savings: Math.max(0, vMrp - vPrice),
              discountPercent: vMrp > vPrice ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0,
            };
          });
        } else if (KNOWN_VARIANT_MAP[id] || KNOWN_VARIANT_MAP[raw.sku]) {
          variants = KNOWN_VARIANT_MAP[id] || KNOWN_VARIANT_MAP[raw.sku];
        } else {
          variants = [
            {
              sku: raw.sku || id,
              weight: parsed.weight,
              price: parsed.price,
              mrp: parsed.mrp,
              savings: Math.max(0, parsed.mrp - parsed.price),
              discountPercent: parsed.mrp > parsed.price ? Math.round(((parsed.mrp - parsed.price) / parsed.mrp) * 100) : 0,
            },
          ];
        }

        const prod: CatalogProduct = {
          id,
          sku: raw.sku || id,
          name: raw.name,
          category: catName,
          categoryId: catId,
          categoryDescription: catDesc,
          parentCategory: 'Nutritional',
          parentCategoryId: 'nutritional',
          weight: parsed.weight,
          pack_sizes: raw.pack_sizes || [parsed.weight],
          variants,
          price: parsed.price,
          mrp: parsed.mrp,
          savings: Math.max(0, parsed.mrp - parsed.price),
          priceString: raw.price || `MRP: ₹${parsed.mrp} | Direct Selling Price: ₹${parsed.price}`,
          image: allImages[0] || images[0],
          images: allImages,
          usp: officialUsp,
          clinical_nutrition_rationale: raw.clinical_nutrition_rationale,
          medical_standards_validation: raw.medical_standards_validation ? {
            ...raw.medical_standards_validation,
            who_may_use: whoMayUse,
            who_should_not_use: whoNotUse,
          } : undefined,
          who_may_use: whoMayUse,
          who_should_not_use: whoNotUse,
          totalIngredientsCount: vTable.length,
          complianceRating: computeProductCompliance(vTable),
          officialDetails: official,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        loadedProducts.push(prod);
      }
    } catch (err) {
      console.error(`Error loading ${filename}:`, err);
    }
  }

  // 1. Filter out deleted products
  const deletedPath = path.join(activeDataDir, 'deleted_products.json');
  let deletedSet = new Set<string>();
  if (fs.existsSync(deletedPath)) {
    try {
      const arr = JSON.parse(fs.readFileSync(deletedPath, 'utf-8'));
      if (Array.isArray(arr)) deletedSet = new Set(arr.map((s: string) => s.toLowerCase()));
    } catch (e) {}
  }

  // 2. Load custom overrides (persisted updates/additions)
  const overridesPath = path.join(activeDataDir, 'custom_overrides.json');
  let overrides: CatalogProduct[] = [];
  if (fs.existsSync(overridesPath)) {
    try {
      const arr = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));
      if (Array.isArray(arr)) overrides = arr;
    } catch (e) {}
  }

  // Filter loaded products by deleted set
  let activeProducts = loadedProducts.filter(
    (p) => !deletedSet.has(p.id.toLowerCase()) && !deletedSet.has(p.sku.toLowerCase())
  );

  // Apply overrides
  for (const override of overrides) {
    if (deletedSet.has(override.id.toLowerCase()) || deletedSet.has(override.sku.toLowerCase())) continue;
    const existingIdx = activeProducts.findIndex(
      (p) => p.id.toLowerCase() === override.id.toLowerCase() || p.sku.toLowerCase() === override.sku.toLowerCase()
    );
    if (existingIdx >= 0) {
      activeProducts[existingIdx] = { ...activeProducts[existingIdx], ...override };
    } else {
      activeProducts.unshift(override);
    }
  }

  categorySummaries = summaries;
  return activeProducts;
}

function getActiveDataDir(): string {
  return getDataDir();
}

export function reloadCatalogFromDisk(): CatalogProduct[] {
  const loaded = loadAllFromDisk();
  globalThis.__nsquare_catalog_cache__ = loaded;
  globalThis.__nsquare_category_summaries__ = categorySummaries;
  return loaded;
}

export function getCatalog(): CatalogProduct[] {
  if (!globalThis.__nsquare_catalog_cache__) {
    const loaded = loadAllFromDisk();
    globalThis.__nsquare_catalog_cache__ = loaded;
    globalThis.__nsquare_category_summaries__ = categorySummaries;
    try {
      const skus = loaded.map((p) => p.sku || p.id).filter(Boolean);
      initStockScheduler(skus);
    } catch (e) {
      // background scheduler notice
    }
  }
  return globalThis.__nsquare_catalog_cache__;
}

export function getCategories(): CategorySummary[] {
  if (!globalThis.__nsquare_catalog_cache__) {
    getCatalog();
  }
  return globalThis.__nsquare_category_summaries__ || categorySummaries;
}

export function getProductById(idOrSku: string): CatalogProduct | undefined {
  const products = getCatalog();
  const query = idOrSku.toLowerCase().trim();
  return products.find(
    (p) =>
      p.id.toLowerCase() === query ||
      p.sku.toLowerCase() === query ||
      p.variants?.some((v) => v.sku.toLowerCase() === query || (v.id && v.id.toLowerCase() === query))
  );
}

export function searchProducts(options: {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: 'Good' | 'Moderate' | 'Bad';
  limit?: number;
}): CatalogProduct[] {
  let products = getCatalog();

  if (options.category && options.category.toLowerCase() !== 'all') {
    const catQuery = options.category.toLowerCase();
    products = products.filter(p => 
      p.category.toLowerCase() === catQuery || 
      p.categoryId.toLowerCase() === catQuery ||
      (p.parentCategoryId && p.parentCategoryId.toLowerCase() === catQuery) ||
      (p.parentCategory && p.parentCategory.toLowerCase() === catQuery) ||
      p.category.toLowerCase().includes(catQuery) ||
      (p.parentCategory && p.parentCategory.toLowerCase().includes(catQuery))
    );
  }

  if (options.query) {
    const q = options.query.toLowerCase();
    products = products.filter(p => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchUsp = p.usp.toLowerCase().includes(q);
      const matchWhat = p.clinical_nutrition_rationale?.what_it_is?.toLowerCase().includes(q);
      const matchWhy = p.clinical_nutrition_rationale?.why_it_is_needed?.toLowerCase().includes(q);
      const matchIngredient = p.medical_standards_validation?.verification_table?.some(row => 
        row.ingredient.toLowerCase().includes(q)
      );
      const matchVariant = p.variants?.some(
        (v) => v.sku.toLowerCase().includes(q) || v.weight.toLowerCase().includes(q)
      );
      return matchName || matchUsp || matchWhat || matchWhy || matchIngredient || matchVariant;
    });
  }

  if (options.minPrice !== undefined) {
    products = products.filter(p => p.price >= options.minPrice!);
  }
  if (options.maxPrice !== undefined) {
    products = products.filter(p => p.price <= options.maxPrice!);
  }

  if (options.rating) {
    products = products.filter(p => p.complianceRating === options.rating);
  }

  if (options.limit && options.limit > 0) {
    products = products.slice(0, options.limit);
  }

  return products;
}

export function upsertProduct(productInput: Partial<CatalogProduct> & { name: string }): CatalogProduct {
  const products = getCatalog();
  const id = productInput.id || `AMW-${Date.now().toString(36).toUpperCase()}`;
  const sku = productInput.sku || id;
  const existingIdx = products.findIndex(p => p.id === id || p.sku === sku);
  const existing = existingIdx >= 0 ? products[existingIdx] : null;

  const price = Number(productInput.price) || 0;
  const mrp = Number(productInput.mrp) || price;
  const images = productInput.images && productInput.images.length > 0 
    ? productInput.images 
    : resolveProductImages(id, productInput.image);

  // Merge official details
  const officialDetails = productInput.officialDetails || existing?.officialDetails || {
    sku,
    officialName: productInput.name,
    detailsHtml: productInput.usp || '',
    featuresHtml: '',
    benefitsHtml: '',
    howToUseHtml: '',
    ingredientsData: { preText: '', specificationTable: [] },
    faqs: [],
    galleryImages: images,
  };

  if (images.length > 0) {
    officialDetails.galleryImages = images;
  }

  // Process variants if passed or keep existing
  let processedVariants: ProductVariant[] | undefined = undefined;
  if (productInput.variants && Array.isArray(productInput.variants) && productInput.variants.length > 0) {
    processedVariants = productInput.variants.map((v) => {
      const vPrice = Number(v.price) || 0;
      const vMrp = Number(v.mrp) || vPrice;
      return {
        sku: v.sku || sku,
        weight: v.weight || productInput.weight || 'Standard Pack',
        price: vPrice,
        mrp: vMrp,
        savings: Math.max(0, vMrp - vPrice),
        discountPercent: vMrp > vPrice ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0,
        inStock: v.inStock !== undefined ? v.inStock : true,
      };
    });
  } else if (existing?.variants && existing.variants.length > 0) {
    processedVariants = existing.variants;
  }

  const fullProduct: CatalogProduct = {
    id,
    sku,
    name: productInput.name,
    category: productInput.category || existing?.category || 'General Nutrition',
    categoryId: productInput.categoryId || existing?.categoryId || 'category_custom',
    categoryDescription: productInput.categoryDescription || existing?.categoryDescription || '',
    parentCategory: productInput.parentCategory || existing?.parentCategory || 'Nutritional',
    parentCategoryId: productInput.parentCategoryId || existing?.parentCategoryId || 'nutritional',
    weight: productInput.weight || existing?.weight || 'Standard Pack',
    pack_sizes: productInput.pack_sizes || existing?.pack_sizes || [productInput.weight || 'Standard Pack'],
    variants: processedVariants,
    price,
    mrp,
    savings: Math.max(0, mrp - price),
    priceString: productInput.priceString || `MRP: ₹${mrp} | Direct Selling Price: ₹${price}`,
    image: images[0],
    images,
    usp: productInput.usp !== undefined ? productInput.usp : (existing?.usp || ''),
    clinical_nutrition_rationale: productInput.clinical_nutrition_rationale || existing?.clinical_nutrition_rationale,
    medical_standards_validation: productInput.medical_standards_validation || existing?.medical_standards_validation,
    who_may_use: productInput.who_may_use || existing?.who_may_use || [],
    who_should_not_use: productInput.who_should_not_use || existing?.who_should_not_use || [],
    totalIngredientsCount: productInput.medical_standards_validation?.verification_table?.length || existing?.totalIngredientsCount || 0,
    complianceRating: computeProductCompliance(productInput.medical_standards_validation?.verification_table) || existing?.complianceRating || 'Good',
    officialDetails,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Update in-memory list
  if (existingIdx >= 0) {
    products[existingIdx] = fullProduct;
  } else {
    products.unshift(fullProduct);
  }

  const activeDir = getActiveDataDir();

  // 2. Persist officialDetails directly to official_amway_details.json
  try {
    const officialPath = path.join(activeDir, 'official_amway_details.json');
    let officialJson: Record<string, any> = {};
    if (fs.existsSync(officialPath)) {
      officialJson = JSON.parse(fs.readFileSync(officialPath, 'utf-8'));
    }
    officialJson[id] = officialDetails;
    if (sku && sku !== id) officialJson[sku] = officialDetails;
    atomicWriteJson(officialPath, officialJson);
  } catch (e) {
    console.error('[CatalogService] Error persisting official details:', e);
  }

  // 3. Persist product to custom_overrides.json
  try {
    const overridesPath = path.join(activeDir, 'custom_overrides.json');
    let overridesList: CatalogProduct[] = [];
    if (fs.existsSync(overridesPath)) {
      overridesList = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));
    }
    const oIdx = overridesList.findIndex(p => p.id === id || p.sku === sku);
    if (oIdx >= 0) {
      overridesList[oIdx] = fullProduct;
    } else {
      overridesList.unshift(fullProduct);
    }
    atomicWriteJson(overridesPath, overridesList);
  } catch (e) {
    console.error('[CatalogService] Error persisting custom overrides:', e);
  }

  // 4. Remove from deleted_products.json if previously deleted
  try {
    const deletedPath = path.join(activeDir, 'deleted_products.json');
    if (fs.existsSync(deletedPath)) {
      let deletedList: string[] = JSON.parse(fs.readFileSync(deletedPath, 'utf-8'));
      deletedList = deletedList.filter(s => s.toLowerCase() !== id.toLowerCase() && s.toLowerCase() !== sku.toLowerCase());
      atomicWriteJson(deletedPath, deletedList);
    }
  } catch (e) {}

  return fullProduct;
}

export function deleteProduct(idOrSku: string): boolean {
  const products = getCatalog();
  const query = idOrSku.toLowerCase().trim();
  const initialLength = products.length;
  const filtered = products.filter(p => p.id.toLowerCase() !== query && p.sku.toLowerCase() !== query);
  globalThis.__nsquare_catalog_cache__ = filtered;

  const activeDir = getActiveDataDir();

  // 1. Remove from custom_overrides.json
  try {
    const overridesPath = path.join(activeDir, 'custom_overrides.json');
    if (fs.existsSync(overridesPath)) {
      let overridesList: CatalogProduct[] = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));
      overridesList = overridesList.filter(p => p.id.toLowerCase() !== query && p.sku.toLowerCase() !== query);
      atomicWriteJson(overridesPath, overridesList);
    }
  } catch (e) {}

  // 2. Add to deleted_products.json
  try {
    const deletedPath = path.join(activeDir, 'deleted_products.json');
    let deletedList: string[] = [];
    if (fs.existsSync(deletedPath)) {
      deletedList = JSON.parse(fs.readFileSync(deletedPath, 'utf-8'));
    }
    if (!deletedList.some(s => s.toLowerCase() === query)) {
      deletedList.push(idOrSku);
      atomicWriteJson(deletedPath, deletedList);
    }
  } catch (e) {}

  return filtered.length < initialLength;
}
