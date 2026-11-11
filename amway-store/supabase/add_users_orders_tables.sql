-- =========================================================================
-- N-SQUARE OFFICIAL AMWAY STORE - USERS, ORDERS, CONTACT & ADMIN SCHEMA
-- Run this query in your Supabase SQL Editor
-- =========================================================================

-- Helper function for timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. USERS TABLE
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  mobile TEXT NOT NULL,
  email TEXT,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  address JSONB DEFAULT '{}'::jsonb,
  inquiry_id TEXT,
  cart JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 2. ORDERS TABLE
DROP TABLE IF EXISTS orders CASCADE;
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT NOT NULL,
  user_mobile TEXT NOT NULL,
  user_email TEXT,
  shipping_address TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10, 2) NOT NULL,
  total_mrp NUMERIC(10, 2),
  savings NUMERIC(10, 2) DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  discount_note TEXT,
  delivery_charge NUMERIC(10, 2) DEFAULT 0,
  delivery_charge_note TEXT,
  final_payable_amount NUMERIC(10, 2),
  status TEXT DEFAULT 'REQUESTED',
  payment_status TEXT DEFAULT 'PENDING',
  payment_method TEXT,
  payment_ref_number TEXT,
  paid_at TIMESTAMPTZ,
  invoice_number TEXT,
  invoice_date TIMESTAMPTZ,
  invoice_url TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  delivered_at TIMESTAMPTZ,
  order_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONTACT SETTINGS TABLE
DROP TABLE IF EXISTS contact_settings CASCADE;
CREATE TABLE contact_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  store_name TEXT NOT NULL,
  tagline TEXT,
  whatsapp_number TEXT,
  whatsapp_display_text TEXT,
  instagram_url TEXT,
  instagram_handle TEXT,
  linkedin_url TEXT,
  linkedin_handle TEXT,
  youtube_url TEXT,
  youtube_handle TEXT,
  support_phone TEXT,
  support_email TEXT,
  office_address TEXT,
  support_hours TEXT,
  welcome_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ADMIN CONFIG TABLE
DROP TABLE IF EXISTS admin_config CASCADE;
CREATE TABLE admin_config (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  pin TEXT NOT NULL DEFAULT '1506',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACCOUNT REQUESTS TABLE
DROP TABLE IF EXISTS account_requests CASCADE;
CREATE TABLE account_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_mobile TEXT NOT NULL,
  request_type TEXT NOT NULL,
  message TEXT NOT NULL,
  requested_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'OPEN',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_requests_user_id ON account_requests(user_id);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_requests ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Allow user operations" ON users;
CREATE POLICY "Allow user operations" ON users FOR ALL USING (true) WITH CHECK (true);

-- Orders policies
DROP POLICY IF EXISTS "Allow order operations" ON orders;
CREATE POLICY "Allow order operations" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Contact Settings policies
DROP POLICY IF EXISTS "Public can view contact settings" ON contact_settings;
CREATE POLICY "Public can view contact settings" ON contact_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow management of contact settings" ON contact_settings;
CREATE POLICY "Allow management of contact settings" ON contact_settings FOR ALL USING (true) WITH CHECK (true);

-- Admin Config policies
DROP POLICY IF EXISTS "Allow admin config operations" ON admin_config;
CREATE POLICY "Allow admin config operations" ON admin_config FOR ALL USING (true) WITH CHECK (true);

-- Account Requests policies
DROP POLICY IF EXISTS "Allow account request operations" ON account_requests;
CREATE POLICY "Allow account request operations" ON account_requests FOR ALL USING (true) WITH CHECK (true);

-- 8. AUTO-UPDATE TIMESTAMPS TRIGGERS
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS set_contact_settings_updated_at ON contact_settings;
CREATE TRIGGER set_contact_settings_updated_at BEFORE UPDATE ON contact_settings
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS set_admin_config_updated_at ON admin_config;
CREATE TRIGGER set_admin_config_updated_at BEFORE UPDATE ON admin_config
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
