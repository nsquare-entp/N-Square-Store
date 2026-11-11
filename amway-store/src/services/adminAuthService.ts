import fs from 'fs';
import path from 'path';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';
import { supabase, getSupabaseAdmin, isSupabaseConfigured } from '../utils/supabase';

interface AdminConfig {
  pin: string;
  updatedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __nsquare_admin_config_cache__: AdminConfig | undefined;
}

let lastAdminSyncTimestamp = 0;
const ADMIN_SYNC_TTL_MS = 60 * 1000;
let isSyncingAdmin = false;

function getAdminConfigPath(): string {
  return getDataFilePath('admin_config.json');
}

export async function syncAdminConfigFromSupabase(): Promise<AdminConfig | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('admin_config').select('*').eq('id', 'primary').single();
    if (error || !data) return null;

    if (data.pin && typeof data.pin === 'string' && /^\d{4}$/.test(data.pin)) {
      const config: AdminConfig = {
        pin: data.pin,
        updatedAt: data.updated_at || new Date().toISOString(),
      };
      globalThis.__nsquare_admin_config_cache__ = config;
      lastAdminSyncTimestamp = Date.now();

      const filePath = getAdminConfigPath();
      atomicWriteJson(filePath, config);
      return config;
    }
    return null;
  } catch (err: any) {
    console.warn('[AdminAuthService] Supabase sync note:', err?.message || err);
    return null;
  }
}

export function getAdminConfig(): AdminConfig {
  if (!globalThis.__nsquare_admin_config_cache__) {
    const filePath = getAdminConfigPath();
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data.pin === 'string' && /^\d{4}$/.test(data.pin)) {
          globalThis.__nsquare_admin_config_cache__ = data;
        }
      } catch (e) {
        console.error('[AdminAuthService] Error reading admin_config.json:', e);
      }
    }

    if (!globalThis.__nsquare_admin_config_cache__) {
      globalThis.__nsquare_admin_config_cache__ = {
        pin: '1506',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // SWR background refresh from Supabase
  const now = Date.now();
  if (isSupabaseConfigured && !isSyncingAdmin && now - lastAdminSyncTimestamp > ADMIN_SYNC_TTL_MS) {
    isSyncingAdmin = true;
    syncAdminConfigFromSupabase().finally(() => {
      isSyncingAdmin = false;
    });
  }

  return globalThis.__nsquare_admin_config_cache__;
}

export function saveAdminConfig(config: AdminConfig): void {
  globalThis.__nsquare_admin_config_cache__ = config;
  const filePath = getAdminConfigPath();
  try {
    atomicWriteJson(filePath, config);
  } catch (e: any) {
    if (e?.code !== 'EROFS' && e?.code !== 'EACCES') {
      console.error('[AdminAuthService] Error saving admin_config.json:', e);
    }
  }

  // Asynchronously sync to Supabase
  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('admin_config').upsert(
          {
            id: 'primary',
            pin: config.pin,
            updated_at: config.updatedAt,
          },
          { onConflict: 'id' }
        );
      } catch (e: any) {
        console.warn('[AdminAuthService] Supabase sync note:', e?.message || e);
      }
    })();
  }
}

export function verifyAdminPin(candidatePin: string): { valid: boolean; token?: string } {
  if (!candidatePin || typeof candidatePin !== 'string') {
    return { valid: false };
  }

  const cleanPin = candidatePin.trim();
  const config = getAdminConfig();

  if (cleanPin === config.pin) {
    // Generate secure session token
    const timestamp = Date.now();
    const token = Buffer.from(`admin_session_${timestamp}_${config.pin}`).toString('base64');
    return { valid: true, token };
  }

  return { valid: false };
}

export function validateSessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split('_');
    if (parts.length >= 4 && parts[0] === 'admin' && parts[1] === 'session') {
      const config = getAdminConfig();
      const tokenPin = parts.slice(3).join('_');
      return tokenPin === config.pin;
    }
  } catch {
    return false;
  }
  return false;
}

export function updateAdminPin(currentPin: string, newPin: string): { success: boolean; error?: string } {
  const config = getAdminConfig();

  if (currentPin.trim() !== config.pin) {
    return { success: false, error: 'Current PIN is incorrect.' };
  }

  const cleanNewPin = newPin.trim();
  if (!/^\d{4}$/.test(cleanNewPin)) {
    return { success: false, error: 'New PIN must be exactly 4 numeric digits.' };
  }

  config.pin = cleanNewPin;
  config.updatedAt = new Date().toISOString();
  saveAdminConfig(config);

  return { success: true };
}
