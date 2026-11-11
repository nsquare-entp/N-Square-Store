-- =========================================================================
-- N-SQUARE OFFICIAL AMWAY STORE - SUPABASE SCHEMA & RLS SETUP
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =========================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 0. CLEANUP OLD / OUTDATED TABLES
-- Drops empty legacy tutorial tables so that all columns match the current app
-- =========================================================================
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

-- =========================================================================
-- 1. CATEGORIES TABLE
-- =========================================================================
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  product_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 2. PRODUCTS TABLE
-- Holds full clinical, medical standard, variant, and pricing data
-- =========================================================================
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  category_description TEXT,
  parent_category TEXT DEFAULT 'Nutritional',
  parent_category_id TEXT DEFAULT 'nutritional',
  weight TEXT NOT NULL,
  pack_sizes JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  price NUMERIC(10, 2) NOT NULL,
  mrp NUMERIC(10, 2) NOT NULL,
  savings NUMERIC(10, 2) GENERATED ALWAYS AS (GREATEST(0, mrp - price)) STORED,
  price_string TEXT,
  image TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  usp TEXT,
  clinical_nutrition_rationale JSONB DEFAULT '{}'::jsonb,
  medical_standards_validation JSONB DEFAULT '{}'::jsonb,
  who_may_use JSONB DEFAULT '[]'::jsonb,
  who_should_not_use JSONB DEFAULT '[]'::jsonb,
  total_ingredients_count INTEGER DEFAULT 0,
  compliance_rating TEXT DEFAULT 'Good' CHECK (compliance_rating IN ('Good', 'Moderate', 'Bad')),
  official_details JSONB DEFAULT '{}'::jsonb,
  in_stock BOOLEAN DEFAULT TRUE,
  stock_level INTEGER DEFAULT 60,
  stock_status TEXT DEFAULT 'IN_STOCK',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 3. BANNERS TABLE
-- =========================================================================
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  link_url TEXT,
  bg_color TEXT,
  active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 4. LEADS TABLE (Consultation & Order Inquiries)
-- =========================================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  interest TEXT,
  message TEXT,
  status TEXT DEFAULT 'NEW',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 5. INDEXES FOR LIGHTNING FAST QUERY PERFORMANCE
-- =========================================================================
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_updated_at ON products(updated_at DESC);
CREATE INDEX idx_banners_active ON banners(active);

-- =========================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures instant public read for the storefront and full write permissions
-- =========================================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Categories policies
DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow management of categories" ON categories;
CREATE POLICY "Allow management of categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Products policies
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Allow management of products" ON products;
CREATE POLICY "Allow management of products" ON products FOR ALL USING (true) WITH CHECK (true);

-- Banners policies
DROP POLICY IF EXISTS "Public can view active banners" ON banners;
CREATE POLICY "Public can view active banners" ON banners FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Allow management of banners" ON banners;
CREATE POLICY "Allow management of banners" ON banners FOR ALL USING (true) WITH CHECK (true);

-- Leads policies
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
CREATE POLICY "Public can insert leads" ON leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow management of leads" ON leads;
CREATE POLICY "Allow management of leads" ON leads FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- 7. AUTO-UPDATE TIMESTAMPS TRIGGER
-- =========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS set_categories_updated_at ON categories;
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS set_products_updated_at ON products;
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
