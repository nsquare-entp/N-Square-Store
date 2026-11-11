/**
 * SEED CATALOG TO SUPABASE
 * Reads the fully verified 44-product local catalog and batch-syncs it to Supabase.
 *
 * Usage:
 *   node scripts/seed_supabase.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL or Key missing in .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const KNOWN_VARIANT_MAP = {
  // NUTRILITE® All Plant Protein Powder
  '329861ID': [
    { sku: '329878ID', weight: '200 g', price: 1017.46, mrp: 1175, savings: 157.54, discountPercent: 13, inStock: true },
    { sku: '329867ID', weight: '500 g', price: 2132.56, mrp: 2460, savings: 327.44, discountPercent: 13, inStock: true },
    { sku: '329861ID', weight: '1 kg', price: 3591, mrp: 4140, savings: 549, discountPercent: 13, inStock: true },
  ],
  // NUTRILITE® Daily Plus
  '329862ID': [
    { sku: '329863ID', weight: '30 Tablets', price: 762.30, mrp: 815, savings: 52.70, discountPercent: 6, inStock: true },
    { sku: '329862ID', weight: '120 Tablets', price: 2511.60, mrp: 2690, savings: 178.40, discountPercent: 7, inStock: true },
  ],
  // NUTRILITE® Daily
  '313504ID': [
    { sku: '313505ID', weight: '60 Tablets', price: 1204.36, mrp: 1289, savings: 84.64, discountPercent: 7, inStock: true },
    { sku: '313504ID', weight: '120 Tablets', price: 2048.56, mrp: 2193, savings: 144.44, discountPercent: 7, inStock: true },
  ],
};

const CATEGORY_FILES = [
  'category1_protein_powders.json',
  'category2_weight_management.json',
  'category3_supplement_tablets_capsules.json',
  'category4_gummies.json',
  'category5_traditional_herbs.json',
];

const dataDir = path.join(__dirname, '..', 'data');
const stockCachePath = path.join(dataDir, 'stock_cache.json');
let stockCache = {};
if (fs.existsSync(stockCachePath)) {
  try {
    stockCache = JSON.parse(fs.readFileSync(stockCachePath, 'utf-8'));
  } catch (e) {}
}

async function runSeed() {
  console.log(`🚀 Connecting to Supabase at ${supabaseUrl}...`);

  const allProducts = [];
  const categoriesMap = new Map();

  for (let i = 0; i < CATEGORY_FILES.length; i++) {
    const filename = CATEGORY_FILES[i];
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const catId = data.category_id || `category${i + 1}`;
    const catName = data.category_name || 'Supplements';
    const catDesc = data.category_description || '';
    const rawProducts = data.products || [];

    categoriesMap.set(catId, {
      id: catId,
      name: catName,
      description: catDesc,
      product_count: rawProducts.length,
      sort_order: i + 1,
      updated_at: new Date().toISOString(),
    });

    for (const raw of rawProducts) {
      const id = raw.id || raw.sku;
      const sku = raw.sku || id;

      // Parse price
      let mrp = 0;
      let price = 0;
      if (raw.price) {
        const mrpM = raw.price.match(/MRP:\s*₹?([\d,]+)/i);
        const aboM = raw.price.match(/(?:ABO|Direct\s*Selling)\s*Price:\s*₹?([\d,.]+)/i);
        if (mrpM) mrp = parseFloat(mrpM[1].replace(/,/g, ''));
        if (aboM) price = parseFloat(aboM[1].replace(/,/g, ''));
      }

      // Stock status from stock_cache
      const stockItem = stockCache[sku] || stockCache[id];
      const inStock = stockItem ? stockItem.inStock : true;
      const stockLevel = stockItem ? stockItem.stockLevel : 60;
      const stockStatus = stockItem ? stockItem.status : 'IN_STOCK';

      // Discontinued products
      const isDiscontinued = sku === '342570ID' || sku === '342568ID';
      const variants = (raw.variants && raw.variants.length > 0)
        ? raw.variants
        : (KNOWN_VARIANT_MAP[id] || KNOWN_VARIANT_MAP[sku] || []);

      const row = {
        id,
        sku,
        name: raw.name,
        category: catName,
        category_id: catId,
        category_description: catDesc,
        parent_category: raw.parent_category || 'Nutritional',
        parent_category_id: raw.parent_category_id || 'nutritional',
        weight: raw.pack_sizes?.[0] || 'Standard Pack',
        pack_sizes: raw.pack_sizes || [],
        variants,
        price: price || mrp,
        mrp: mrp || price,
        price_string: raw.price || `MRP: ₹${mrp} | ABO Price: ₹${price}`,
        image: raw.image || raw.image_url || `/images/products/${id}.png`,
        images: raw.images || [raw.image || raw.image_url],
        usp: raw.usp || '',
        clinical_nutrition_rationale: raw.clinical_nutrition_rationale || {},
        medical_standards_validation: raw.medical_standards_validation || {},
        who_may_use: raw.target_audience?.who_may_use || raw.who_may_use || [],
        who_should_not_use: raw.target_audience?.who_should_not_use || raw.who_should_not_use || [],
        total_ingredients_count: raw.medical_standards_validation?.verification_table?.length || 0,
        compliance_rating: 'Good',
        official_details: raw.official_details || {},
        in_stock: inStock && !isDiscontinued,
        stock_level: isDiscontinued ? 0 : stockLevel,
        stock_status: isDiscontinued ? 'OUT_OF_STOCK' : stockStatus,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      allProducts.push(row);
    }
  }

  // Also write the unified cache snapshot locally to data/supabase_catalog_cache.json
  const cachePath = path.join(dataDir, 'supabase_catalog_cache.json');
  fs.writeFileSync(cachePath, JSON.stringify(allProducts, null, 2), 'utf-8');
  console.log(`💾 Saved local high-speed cache of ${allProducts.length} products to ${cachePath}`);

  // 1. Upsert Categories to Supabase
  const categoriesList = Array.from(categoriesMap.values());
  console.log(`🔄 Syncing ${categoriesList.length} categories to Supabase...`);
  const { error: catErr } = await supabase.from('categories').upsert(categoriesList, { onConflict: 'id' });
  if (catErr) {
    console.error('⚠️ Category sync error:', catErr.message);
  } else {
    console.log('✅ Categories successfully synced to Supabase!');
  }

  // 2. Upsert Products in Batches of 10 to Supabase
  console.log(`🔄 Syncing ${allProducts.length} products to Supabase...`);
  let successCount = 0;
  for (let i = 0; i < allProducts.length; i += 10) {
    const chunk = allProducts.slice(i, i + 10);
    const { error: prodErr } = await supabase.from('products').upsert(chunk, { onConflict: 'id' });
    if (prodErr) {
      console.error(`⚠️ Batch ${i / 10 + 1} error:`, prodErr.message);
    } else {
      successCount += chunk.length;
      console.log(`  ✓ Synced ${successCount} / ${allProducts.length} products...`);
    }
  }

  console.log(`🎉 Supabase catalog seeding completed! (${successCount}/${allProducts.length} uploaded)`);
}

runSeed().catch((err) => {
  console.error('Fatal seed error:', err.message);
});
