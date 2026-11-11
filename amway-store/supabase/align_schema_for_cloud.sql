-- =========================================================================
-- N-SQUARE AMWAY STORE - CLOUD SCHEMA ALIGNMENT
-- Run this in Supabase SQL Editor to support pure database-driven mode
-- =========================================================================

-- 1. Align Categories table for full hierarchy & Lucide icon identifiers
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Tag';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- 2. Align Banners table for promotional banner images
ALTER TABLE banners ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Align Leads table for WhatsApp consultation inquiries
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cart_items JSONB DEFAULT '[]'::jsonb;

-- 4. Seed storefront parent departments into categories table (using Lucide icon keys)
INSERT INTO categories (id, name, icon, description, sort_order, parent_id)
VALUES
  ('nutritional', 'Nutritional', 'HeartPulse', 'Nutrilite foundational vitamins, protein powders, dietary supplements, and authentic Ayurvedic wellness formulations.', 1, NULL),
  ('beauty', 'Beauty', 'Sparkles', 'Artistry prestige skincare, targeted serums, dermatological treatments, and radiant cosmetics.', 2, NULL),
  ('personal_care', 'Personal Care', 'Droplets', 'G&H botanical body care, Glister total oral care solutions, and Satinique salon-grade hair care.', 3, NULL),
  ('home_living', 'Home & Living', 'Home', 'Amway Queen premium cookware, Atmosphere air treatment systems, and concentrated eco-friendly cleaning.', 4, NULL),
  ('others', 'Others', 'Package', 'Specialized health accessories, fitness tools, dispensers, and wellness literature.', 5, NULL)
ON CONFLICT (id) DO UPDATE SET
  icon = EXCLUDED.icon,
  parent_id = EXCLUDED.parent_id;

-- 5. Link existing 5 subcategories under Nutritional parent (using Lucide icon keys)
UPDATE categories SET icon = 'Dumbbell', parent_id = 'nutritional' WHERE id = 'category1';
UPDATE categories SET icon = 'Scale', parent_id = 'nutritional' WHERE id = 'category2';
UPDATE categories SET icon = 'Pill', parent_id = 'nutritional' WHERE id = 'category3';
UPDATE categories SET icon = 'Heart', parent_id = 'nutritional' WHERE id = 'category4';
UPDATE categories SET icon = 'Leaf', parent_id = 'nutritional' WHERE id = 'category5';
