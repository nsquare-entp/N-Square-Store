/**
 * SEED USERS, ORDERS, CONTACT SETTINGS & ADMIN CONFIG TO SUPABASE
 *
 * Usage:
 *   node scripts/seed_users_orders.js
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
const dataDir = path.join(__dirname, '..', 'data');

async function seed() {
  console.log(`🚀 Connecting to Supabase at ${supabaseUrl}...`);

  // 1. Sync Contact Settings
  const contactPath = path.join(dataDir, 'contact_settings.json');
  if (fs.existsSync(contactPath)) {
    try {
      const contactData = JSON.parse(fs.readFileSync(contactPath, 'utf-8'));
      const contactRow = {
        id: 'primary',
        store_name: contactData.storeName || 'N-Square Official',
        tagline: contactData.tagline || '',
        whatsapp_number: contactData.whatsappNumber || '',
        whatsapp_display_text: contactData.whatsappDisplayText || '',
        instagram_url: contactData.instagramUrl || '',
        instagram_handle: contactData.instagramHandle || '',
        linkedin_url: contactData.linkedinUrl || '',
        linkedin_handle: contactData.linkedinHandle || '',
        youtube_url: contactData.youtubeUrl || '',
        youtube_handle: contactData.youtubeHandle || '',
        support_phone: contactData.supportPhone || '',
        support_email: contactData.supportEmail || '',
        office_address: contactData.officeAddress || '',
        support_hours: contactData.supportHours || '',
        welcome_message: contactData.welcomeMessage || '',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('contact_settings').upsert(contactRow, { onConflict: 'id' });
      if (error) console.error('⚠️ Contact settings sync error:', error.message);
      else console.log('✅ Contact settings synced to Supabase!');
    } catch (e) {
      console.error('Error syncing contact settings:', e.message);
    }
  }

  // 2. Sync Admin Config
  const adminConfigPath = path.join(dataDir, 'admin_config.json');
  if (fs.existsSync(adminConfigPath)) {
    try {
      const adminData = JSON.parse(fs.readFileSync(adminConfigPath, 'utf-8'));
      const adminRow = {
        id: 'primary',
        pin: adminData.pin || '1506',
        updated_at: adminData.updatedAt || new Date().toISOString(),
      };
      const { error } = await supabase.from('admin_config').upsert(adminRow, { onConflict: 'id' });
      if (error) console.error('⚠️ Admin config sync error:', error.message);
      else console.log(`✅ Admin config (PIN) synced to Supabase!`);
    } catch (e) {
      console.error('Error syncing admin config:', e.message);
    }
  }

  // 3. Sync Users
  const usersPath = path.join(dataDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      if (Array.isArray(usersData) && usersData.length > 0) {
        console.log(`🔄 Syncing ${usersData.length} users to Supabase...`);
        // Map to DB column names and deduplicate by mobile (keep latest)
        const uniqueUsersMap = new Map();
        for (const u of usersData) {
          const mobile = u.mobile ? u.mobile.trim() : u.id;
          const userRow = {
            id: u.id,
            mobile: mobile,
            email: u.email || null,
            name: u.name || 'Customer',
            password: u.password || 'User@123',
            address: u.address || {},
            inquiry_id: u.inquiryId || null,
            cart: u.cart || [],
            status: u.status || 'ACTIVE',
            notes: u.notes || null,
            created_at: u.createdAt || new Date().toISOString(),
            updated_at: u.updatedAt || new Date().toISOString(),
            last_login_at: u.lastLoginAt || null,
          };
          uniqueUsersMap.set(u.id, userRow);
        }
        const userRows = Array.from(uniqueUsersMap.values());
        const { error } = await supabase.from('users').upsert(userRows, { onConflict: 'id' });
        if (error) console.error('⚠️ Users sync error:', error.message);
        else console.log(`✅ ${userRows.length} users successfully synced to Supabase!`);
      }
    } catch (e) {
      console.error('Error syncing users:', e.message);
    }
  }

  // 4. Sync Orders
  const ordersPath = path.join(dataDir, 'orders.json');
  if (fs.existsSync(ordersPath)) {
    try {
      const ordersData = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
      if (Array.isArray(ordersData) && ordersData.length > 0) {
        console.log(`🔄 Syncing ${ordersData.length} orders to Supabase...`);
        const orderRows = ordersData.map((o) => ({
          id: o.id,
          user_id: o.userId || null,
          user_name: o.userName || 'Customer',
          user_mobile: o.userMobile || '',
          user_email: o.userEmail || null,
          shipping_address: o.shippingAddress || '',
          items: o.items || [],
          total_amount: Number(o.totalAmount) || 0,
          total_mrp: o.totalMrp ? Number(o.totalMrp) : null,
          savings: Number(o.savings) || 0,
          discount_amount: Number(o.discountAmount) || 0,
          discount_note: o.discountNote || null,
          delivery_charge: Number(o.deliveryCharge) || 0,
          delivery_charge_note: o.deliveryChargeNote || null,
          final_payable_amount: o.finalPayableAmount !== undefined ? Number(o.finalPayableAmount) : Number(o.totalAmount),
          status: o.status || 'REQUESTED',
          payment_status: o.paymentStatus || 'PENDING',
          payment_method: o.paymentMethod || null,
          payment_ref_number: o.paymentRefNumber || null,
          paid_at: o.paidAt || null,
          invoice_number: o.invoiceNumber || null,
          invoice_date: o.invoiceDate || null,
          invoice_url: o.invoiceUrl || null,
          courier_name: o.courierName || null,
          tracking_number: o.trackingNumber || null,
          tracking_url: o.trackingUrl || null,
          delivered_at: o.deliveredAt || null,
          order_notes: o.orderNotes || null,
          admin_notes: o.adminNotes || null,
          created_at: o.createdAt || new Date().toISOString(),
          updated_at: o.updatedAt || new Date().toISOString(),
        }));
        const { error } = await supabase.from('orders').upsert(orderRows, { onConflict: 'id' });
        if (error) console.error('⚠️ Orders sync error:', error.message);
        else console.log(`✅ ${orderRows.length} orders successfully synced to Supabase!`);
      }
    } catch (e) {
      console.error('Error syncing orders:', e.message);
    }
  }

  // 5. Sync Account Requests
  const requestsPath = path.join(dataDir, 'account_requests.json');
  if (fs.existsSync(requestsPath)) {
    try {
      const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'));
      if (Array.isArray(requestsData) && requestsData.length > 0) {
        console.log(`🔄 Syncing ${requestsData.length} account requests to Supabase...`);
        const reqRows = requestsData.map((r) => ({
          id: r.id,
          user_id: r.userId,
          user_name: r.userName || '',
          user_mobile: r.userMobile || '',
          request_type: r.requestType || 'GENERAL_INQUIRY',
          message: r.message || '',
          requested_data: r.requestedData || {},
          status: r.status || 'OPEN',
          admin_notes: r.adminNotes || null,
          created_at: r.createdAt || new Date().toISOString(),
          resolved_at: r.resolvedAt || null,
        }));
        const { error } = await supabase.from('account_requests').upsert(reqRows, { onConflict: 'id' });
        if (error) console.error('⚠️ Account requests sync error:', error.message);
        else console.log(`✅ ${reqRows.length} account requests synced to Supabase!`);
      }
    } catch (e) {
      console.error('Error syncing account requests:', e.message);
    }
  }

  console.log('🎉 Full entity sync script finished!');
}

seed().catch((e) => console.error('Fatal seed error:', e.message));

