import fs from 'fs';
import path from 'path';
import { CustomerOrder } from '../types/user';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';
import { supabase, getSupabaseAdmin, isSupabaseConfigured } from '../utils/supabase';

declare global {
  // eslint-disable-next-line no-var
  var __nsquare_orders_cache__: CustomerOrder[] | undefined;
}

let lastOrdersSyncTimestamp = 0;
const ORDERS_SYNC_TTL_MS = 30 * 1000; // 30 seconds SWR window
let isSyncingOrders = false;

function getOrdersFilePath(): string {
  return getDataFilePath('orders.json');
}

function mapOrderToRow(o: CustomerOrder) {
  return {
    id: o.id,
    user_id: o.userId || null,
    user_name: o.userName,
    user_mobile: o.userMobile,
    user_email: o.userEmail || null,
    shipping_address: o.shippingAddress,
    items: o.items || [],
    total_amount: o.totalAmount,
    total_mrp: o.totalMrp ?? null,
    savings: o.savings ?? 0,
    discount_amount: o.discountAmount ?? 0,
    discount_note: o.discountNote || null,
    delivery_charge: o.deliveryCharge ?? 0,
    delivery_charge_note: o.deliveryChargeNote || null,
    final_payable_amount: o.finalPayableAmount ?? o.totalAmount,
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
  };
}

function mapRowToOrder(row: any): CustomerOrder {
  return {
    id: row.id,
    userId: row.user_id || '',
    userName: row.user_name || '',
    userMobile: row.user_mobile || '',
    userEmail: row.user_email || undefined,
    shippingAddress: row.shipping_address || '',
    items: Array.isArray(row.items) ? row.items : [],
    totalAmount: Number(row.total_amount) || 0,
    totalMrp: row.total_mrp != null ? Number(row.total_mrp) : undefined,
    savings: row.savings != null ? Number(row.savings) : 0,
    discountAmount: row.discount_amount != null ? Number(row.discount_amount) : 0,
    discountNote: row.discount_note || undefined,
    deliveryCharge: row.delivery_charge != null ? Number(row.delivery_charge) : 0,
    deliveryChargeNote: row.delivery_charge_note || undefined,
    finalPayableAmount: row.final_payable_amount != null ? Number(row.final_payable_amount) : undefined,
    status: row.status || 'REQUESTED',
    paymentStatus: row.payment_status || 'PENDING',
    paymentMethod: row.payment_method || undefined,
    paymentRefNumber: row.payment_ref_number || undefined,
    paidAt: row.paid_at || undefined,
    invoiceNumber: row.invoice_number || undefined,
    invoiceDate: row.invoice_date || undefined,
    invoiceUrl: row.invoice_url || undefined,
    courierName: row.courier_name || undefined,
    trackingNumber: row.tracking_number || undefined,
    trackingUrl: row.tracking_url || undefined,
    deliveredAt: row.delivered_at || undefined,
    orderNotes: row.order_notes || undefined,
    adminNotes: row.admin_notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Revalidates orders from Supabase (SWR pattern)
 */
export async function syncOrdersFromSupabase(): Promise<CustomerOrder[]> {
  if (!isSupabaseConfigured) return getAllOrders();
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return getAllOrders();
    }
    const mapped = data.map(mapRowToOrder);
    globalThis.__nsquare_orders_cache__ = mapped;
    lastOrdersSyncTimestamp = Date.now();

    const filePath = getOrdersFilePath();
    atomicWriteJson(filePath, mapped);
    return mapped;
  } catch (err: any) {
    console.warn('[OrderService] Supabase sync note:', err?.message || err);
    return getAllOrders();
  }
}

/**
 * Zero-latency order retrieval: in-memory / local disk first, background SWR.
 */
export function getAllOrders(forceReload = false): CustomerOrder[] {
  if (!forceReload && globalThis.__nsquare_orders_cache__) {
    // SWR trigger
    const now = Date.now();
    if (isSupabaseConfigured && !isSyncingOrders && now - lastOrdersSyncTimestamp > ORDERS_SYNC_TTL_MS) {
      isSyncingOrders = true;
      syncOrdersFromSupabase().finally(() => {
        isSyncingOrders = false;
      });
    }
    return globalThis.__nsquare_orders_cache__;
  }

  const filePath = getOrdersFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        globalThis.__nsquare_orders_cache__ = parsed.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (e) {
      console.error('[OrderService] Error reading orders.json:', e);
    }
  }

  if (!globalThis.__nsquare_orders_cache__) {
    globalThis.__nsquare_orders_cache__ = [];
  }

  // Trigger SWR sync
  const now = Date.now();
  if (isSupabaseConfigured && !isSyncingOrders && now - lastOrdersSyncTimestamp > ORDERS_SYNC_TTL_MS) {
    isSyncingOrders = true;
    syncOrdersFromSupabase().finally(() => {
      isSyncingOrders = false;
    });
  }

  return globalThis.__nsquare_orders_cache__;
}

export function saveAllOrders(orders: CustomerOrder[]): void {
  globalThis.__nsquare_orders_cache__ = orders;
  const filePath = getOrdersFilePath();
  try {
    atomicWriteJson(filePath, orders);
  } catch (e: any) {
    if (e?.code !== 'EROFS' && e?.code !== 'EACCES') {
      console.error('[OrderService] Error saving orders.json:', e);
    }
  }

  if (isSupabaseConfigured && orders.length > 0) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        const rows = orders.map(mapOrderToRow);
        await admin.from('orders').upsert(rows, { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[OrderService] Supabase sync error on saveAllOrders:', e?.message || e);
      }
    })();
  }
}

export function getOrdersByUserId(userId: string): CustomerOrder[] {
  const orders = getAllOrders();
  return orders.filter((o) => o.userId === userId);
}

export function createOrder(data: Omit<CustomerOrder, 'id' | 'createdAt' | 'updatedAt'>): CustomerOrder {
  const orders = getAllOrders();
  const id = `ORD-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

  const discount = Number(data.discountAmount) || 0;
  const delivery = Number(data.deliveryCharge) || 0;
  const finalPayable = data.finalPayableAmount ?? Math.max(0, data.totalAmount - discount + delivery);

  const newOrder: CustomerOrder = {
    ...data,
    id,
    status: data.status || 'REQUESTED',
    discountAmount: discount,
    deliveryCharge: delivery,
    finalPayableAmount: finalPayable,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  saveAllOrders(orders);

  // Write-through to Supabase
  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('orders').upsert(mapOrderToRow(newOrder), { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[OrderService] Supabase sync error on createOrder:', e?.message || e);
      }
    })();
  }

  return newOrder;
}

export function updateOrder(id: string, updates: Partial<CustomerOrder>): CustomerOrder | null {
  const orders = getAllOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx < 0) return null;

  const current = orders[idx];
  const total = updates.totalAmount !== undefined ? Number(updates.totalAmount) : current.totalAmount;
  const discount = updates.discountAmount !== undefined ? Number(updates.discountAmount) : (Number(current.discountAmount) || 0);
  const delivery = updates.deliveryCharge !== undefined ? Number(updates.deliveryCharge) : (Number(current.deliveryCharge) || 0);

  const finalPayable = updates.finalPayableAmount !== undefined
    ? Number(updates.finalPayableAmount)
    : Math.max(0, total - discount + delivery);

  const updated: CustomerOrder = {
    ...current,
    ...updates,
    discountAmount: discount,
    deliveryCharge: delivery,
    finalPayableAmount: finalPayable,
    id: current.id,
    updatedAt: new Date().toISOString(),
  };

  orders[idx] = updated;
  saveAllOrders(orders);

  // Write-through to Supabase
  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('orders').upsert(mapOrderToRow(updated), { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[OrderService] Supabase sync error on updateOrder:', e?.message || e);
      }
    })();
  }

  return updated;
}

export function deleteOrder(id: string): boolean {
  const orders = getAllOrders();
  const initialLength = orders.length;
  const filtered = orders.filter((o) => o.id !== id);
  if (filtered.length < initialLength) {
    saveAllOrders(filtered);

    // Write-through delete in Supabase
    if (isSupabaseConfigured) {
      (async () => {
        try {
          const admin = getSupabaseAdmin();
          await admin.from('orders').delete().eq('id', id);
        } catch (e: any) {
          console.warn('[OrderService] Supabase sync error on deleteOrder:', e?.message || e);
        }
      })();
    }

    return true;
  }
  return false;
}
