import fs from 'fs';
import path from 'path';
import { UserAccount } from '../types/user';
import { CartItem } from '../store/useCartStore';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';
import { deleteAccountRequestsByUserId } from './accountRequestService';
import { supabase, getSupabaseAdmin, isSupabaseConfigured } from '../utils/supabase';

declare global {
  // eslint-disable-next-line no-var
  var __nsquare_users_cache__: UserAccount[] | undefined;
}

let lastUsersSyncTimestamp = 0;
const USERS_SYNC_TTL_MS = 30 * 1000; // 30 seconds SWR window
let isSyncingUsers = false;

function getUsersFilePath(): string {
  return getDataFilePath('users.json');
}

function mapUserToRow(u: UserAccount) {
  return {
    id: u.id,
    mobile: u.mobile,
    email: u.email || null,
    name: u.name,
    password: u.password,
    address: u.address || {},
    inquiry_id: u.inquiryId || null,
    cart: u.cart || [],
    status: u.status || 'ACTIVE',
    notes: u.notes || null,
    created_at: u.createdAt || new Date().toISOString(),
    updated_at: u.updatedAt || new Date().toISOString(),
    last_login_at: u.lastLoginAt || null,
  };
}

function mapRowToUser(row: any): UserAccount {
  return {
    id: row.id,
    mobile: row.mobile,
    email: row.email || '',
    name: row.name,
    password: row.password,
    address: row.address && typeof row.address === 'object' ? row.address : {},
    inquiryId: row.inquiry_id || undefined,
    cart: Array.isArray(row.cart) ? row.cart : [],
    status: (row.status as 'ACTIVE' | 'SUSPENDED') || 'ACTIVE',
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    lastLoginAt: row.last_login_at || undefined,
  };
}

/**
 * Sync users from Supabase in background (SWR pattern)
 */
export async function syncUsersFromSupabase(): Promise<UserAccount[]> {
  if (!isSupabaseConfigured) return getAllUsers();
  try {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return getAllUsers();
    }
    const mapped = data.map(mapRowToUser);
    globalThis.__nsquare_users_cache__ = mapped;
    lastUsersSyncTimestamp = Date.now();

    const filePath = getUsersFilePath();
    atomicWriteJson(filePath, mapped);
    return mapped;
  } catch (err: any) {
    console.warn('[UserService] Supabase sync note:', err?.message || err);
    return getAllUsers();
  }
}

/**
 * Returns all registered users with zero latency.
 * Serves from memory/disk first, revalidates in the background.
 */
export function getAllUsers(forceReload: boolean = false): UserAccount[] {
  if (!forceReload && globalThis.__nsquare_users_cache__) {
    // SWR trigger
    const now = Date.now();
    if (isSupabaseConfigured && !isSyncingUsers && now - lastUsersSyncTimestamp > USERS_SYNC_TTL_MS) {
      isSyncingUsers = true;
      syncUsersFromSupabase().finally(() => {
        isSyncingUsers = false;
      });
    }
    return globalThis.__nsquare_users_cache__;
  }

  const filePath = getUsersFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        globalThis.__nsquare_users_cache__ = parsed;
      }
    } catch (e) {
      console.error('[UserService] Error reading users.json:', e);
    }
  }

  if (!globalThis.__nsquare_users_cache__) {
    globalThis.__nsquare_users_cache__ = [];
  }

  // Trigger SWR sync
  const now = Date.now();
  if (isSupabaseConfigured && !isSyncingUsers && now - lastUsersSyncTimestamp > USERS_SYNC_TTL_MS) {
    isSyncingUsers = true;
    syncUsersFromSupabase().finally(() => {
      isSyncingUsers = false;
    });
  }

  return globalThis.__nsquare_users_cache__;
}

export function saveAllUsers(users: UserAccount[]): void {
  globalThis.__nsquare_users_cache__ = [...users];
  const filePath = getUsersFilePath();
  try {
    atomicWriteJson(filePath, users);
  } catch (e: any) {
    if (e?.code !== 'EROFS' && e?.code !== 'EACCES') {
      console.error('[UserService] Error saving users.json:', e);
    }
  }

  if (isSupabaseConfigured && users.length > 0) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        const rows = users.map(mapUserToRow);
        await admin.from('users').upsert(rows, { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[UserService] Supabase sync error on saveAllUsers:', e?.message || e);
      }
    })();
  }
}

export function getUserById(id: string): UserAccount | undefined {
  if (!id) return undefined;
  const cleanId = id.trim().toLowerCase();
  const users = getAllUsers();
  return users.find((u) => u.id === id || u.id.trim().toLowerCase() === cleanId);
}

export function getUserByLoginKey(loginKey: string): UserAccount | undefined {
  const users = getAllUsers();
  const cleaned = loginKey.trim().toLowerCase();
  const digitsOnly = cleaned.replace(/\D/g, '');

  return users.find((u) => {
    const uMobileDigits = (u.mobile || '').replace(/\D/g, '');
    const mobileMatch =
      (digitsOnly.length >= 10 && uMobileDigits.slice(-10) === digitsOnly.slice(-10)) ||
      (digitsOnly.length > 0 && uMobileDigits === digitsOnly);
    const emailMatch = u.email && u.email.toLowerCase() === cleaned;
    const idMatch = u.id.toLowerCase() === cleaned;
    return mobileMatch || emailMatch || idMatch;
  });
}

export function createUser(data: {
  mobile: string;
  name: string;
  password?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  notes?: string;
  inquiryId?: string;
  cart?: CartItem[];
  status?: 'ACTIVE' | 'SUSPENDED';
}): UserAccount {
  const users = getAllUsers();
  const id = `USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Default custom password if not provided by admin
  const password = data.password && data.password.trim() ? data.password.trim() : 'Nsquare@123';

  const newUser: UserAccount = {
    id,
    mobile: data.mobile.trim(),
    email: data.email?.trim() || '',
    name: data.name.trim(),
    password,
    address: data.address || {},
    inquiryId: data.inquiryId,
    cart: data.cart || [],
    status: data.status || 'ACTIVE',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.unshift(newUser);
  saveAllUsers(users);

  // Write-through to Supabase
  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('users').upsert(mapUserToRow(newUser), { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[UserService] Supabase sync error on createUser:', e?.message || e);
      }
    })();
  }

  return newUser;
}

export function updateUser(id: string, updates: Partial<UserAccount>): UserAccount | null {
  if (!id) return null;
  const cleanId = id.trim().toLowerCase();
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === id || u.id.trim().toLowerCase() === cleanId);
  if (idx < 0) return null;

  const updated: UserAccount = {
    ...users[idx],
    ...updates,
    id: users[idx].id, // protect ID
    updatedAt: new Date().toISOString(),
  };

  users[idx] = updated;
  saveAllUsers(users);

  // Write-through to Supabase
  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('users').upsert(mapUserToRow(updated), { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[UserService] Supabase sync error on updateUser:', e?.message || e);
      }
    })();
  }

  return updated;
}

export function deleteUser(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const cleanId = id.trim();
  const users = getAllUsers();
  const initialLength = users.length;
  const filtered = users.filter((u) => u.id !== cleanId && u.id.trim().toLowerCase() !== cleanId.toLowerCase());
  if (filtered.length < initialLength) {
    saveAllUsers(filtered);
    try {
      deleteAccountRequestsByUserId(cleanId);
    } catch {}

    // Delete in Supabase
    if (isSupabaseConfigured) {
      (async () => {
        try {
          const admin = getSupabaseAdmin();
          await admin.from('users').delete().eq('id', cleanId);
        } catch (e: any) {
          console.warn('[UserService] Supabase sync error on deleteUser:', e?.message || e);
        }
      })();
    }

    return true;
  }
  return false;
}

export function syncUserCart(userId: string, cartItems: CartItem[]): boolean {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return false;

  user.cart = cartItems;
  user.updatedAt = new Date().toISOString();
  saveAllUsers(users);
  return true;
}
