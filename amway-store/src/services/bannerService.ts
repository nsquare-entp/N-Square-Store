import fs from 'fs';
import path from 'path';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';
import { supabase, getSupabaseAdmin, isSupabaseConfigured } from '../utils/supabase';

export interface BannerItem {
  id: string | number;
  image_url: string;
  title?: string;
  link?: string;
  created_at?: string;
}

function getBannersFilePath(): string {
  return getDataFilePath('banners.json');
}

declare global {
  // eslint-disable-next-line no-var
  var __nsquare_banners_cache__: BannerItem[] | undefined;
}

let lastBannersSyncTimestamp = 0;
const BANNERS_SYNC_TTL_MS = 60 * 1000;
let isSyncingBanners = false;

function mapBannerToRow(b: BannerItem) {
  return {
    id: typeof b.id === 'string' && b.id.includes('-') ? b.id : undefined,
    title: b.title || 'Promotional Banner',
    image_url: b.image_url,
    link_url: b.link || '/products',
    active: true,
    created_at: b.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mapRowToBanner(row: any): BannerItem {
  return {
    id: row.id,
    image_url: row.image_url || '',
    title: row.title || '',
    link: row.link_url || row.link || '/products',
    created_at: row.created_at || new Date().toISOString(),
  };
}

/**
 * Revalidate banners from Supabase
 */
export async function syncBannersFromSupabase(): Promise<BannerItem[]> {
  if (!isSupabaseConfigured) return getBanners();
  try {
    const { data, error } = await supabase.from('banners').select('*').eq('active', true).order('created_at', { ascending: false });
    if (error || !data) {
      return getBanners();
    }
    const mapped = data.map(mapRowToBanner);
    globalThis.__nsquare_banners_cache__ = mapped;
    lastBannersSyncTimestamp = Date.now();

    const bannersFile = getBannersFilePath();
    atomicWriteJson(bannersFile, mapped);
    return mapped;
  } catch (err: any) {
    console.warn('[BannerService] Supabase sync note:', err?.message || err);
    return getBanners();
  }
}

/**
 * Reads all active promotional banners.
 * Returns an empty array if no banners have been uploaded.
 */
export function getBanners(forceReload: boolean = false): BannerItem[] {
  if (!forceReload && globalThis.__nsquare_banners_cache__) {
    // SWR trigger
    const now = Date.now();
    if (isSupabaseConfigured && !isSyncingBanners && now - lastBannersSyncTimestamp > BANNERS_SYNC_TTL_MS) {
      isSyncingBanners = true;
      syncBannersFromSupabase().finally(() => {
        isSyncingBanners = false;
      });
    }
    return globalThis.__nsquare_banners_cache__;
  }

  try {
    const bannersFile = getBannersFilePath();
    if (fs.existsSync(bannersFile)) {
      const content = fs.readFileSync(bannersFile, 'utf-8');
      const parsed = JSON.parse(content);
      globalThis.__nsquare_banners_cache__ = Array.isArray(parsed) ? parsed : [];
    } else {
      globalThis.__nsquare_banners_cache__ = [];
    }
  } catch (err) {
    console.error('Error reading banners.json:', err);
    globalThis.__nsquare_banners_cache__ = [];
  }

  // Trigger SWR sync
  const now = Date.now();
  if (isSupabaseConfigured && !isSyncingBanners && now - lastBannersSyncTimestamp > BANNERS_SYNC_TTL_MS) {
    isSyncingBanners = true;
    syncBannersFromSupabase().finally(() => {
      isSyncingBanners = false;
    });
  }

  return globalThis.__nsquare_banners_cache__ || [];
}

/**
 * Saves banners array to disk and Supabase.
 */
export function saveBanners(banners: BannerItem[]): boolean {
  globalThis.__nsquare_banners_cache__ = banners;
  try {
    const bannersFile = getBannersFilePath();
    atomicWriteJson(bannersFile, banners);
  } catch (err: any) {
    if (err?.code !== 'EROFS' && err?.code !== 'EACCES') {
      console.error('Error saving banners.json:', err);
    }
  }
  return true;
}

/**
 * Appends a new banner image.
 */
export function addBanner(imageUrl: string, title?: string, link?: string): BannerItem {
  const banners = getBanners();
  const id = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newBanner: BannerItem = {
    id,
    image_url: imageUrl,
    title: title || '',
    link: link || '/products',
    created_at: new Date().toISOString(),
  };
  banners.push(newBanner);
  saveBanners(banners);

  // Write-through to Supabase
  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('banners').insert([mapBannerToRow(newBanner)]);
      } catch (e: any) {
        console.warn('[BannerService] Supabase insert note:', e?.message || e);
      }
    })();
  }

  return newBanner;
}

/**
 * Deletes a banner by id or index.
 */
export function deleteBanner(id: string | number): boolean {
  const banners = getBanners();
  const idStr = String(id);
  const initialLength = banners.length;
  let updated = banners.filter((b) => String(b.id) !== idStr);
  
  if (updated.length === initialLength) {
    const num = Number(id);
    if (!isNaN(num) && num >= 0 && num < banners.length) {
      updated = banners.filter((_, idx) => idx !== num);
    }
  }

  saveBanners(updated);

  // Delete in Supabase
  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('banners').delete().eq('id', idStr);
      } catch (e: any) {
        console.warn('[BannerService] Supabase delete note:', e?.message || e);
      }
    })();
  }

  return true;
}
