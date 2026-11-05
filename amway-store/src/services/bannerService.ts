import fs from 'fs';
import path from 'path';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';

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

/**
 * Reads all active promotional banners.
 * Returns an empty array if no banners have been uploaded.
 */
export function getBanners(forceReload: boolean = false): BannerItem[] {
  if (!forceReload && globalThis.__nsquare_banners_cache__) {
    return globalThis.__nsquare_banners_cache__;
  }
  try {
    const bannersFile = getBannersFilePath();
    if (!fs.existsSync(bannersFile)) {
      atomicWriteJson(bannersFile, []);
      globalThis.__nsquare_banners_cache__ = [];
      return globalThis.__nsquare_banners_cache__;
    }
    const content = fs.readFileSync(bannersFile, 'utf-8');
    const parsed = JSON.parse(content);
    globalThis.__nsquare_banners_cache__ = Array.isArray(parsed) ? parsed : [];
    return globalThis.__nsquare_banners_cache__;
  } catch (err) {
    console.error('Error reading banners.json:', err);
    return [];
  }
}

/**
 * Saves banners array to disk.
 */
export function saveBanners(banners: BannerItem[]): boolean {
  globalThis.__nsquare_banners_cache__ = banners;
  try {
    const bannersFile = getBannersFilePath();
    atomicWriteJson(bannersFile, banners);
    return true;
  } catch (err: any) {
    if (err?.code !== 'EROFS' && err?.code !== 'EACCES') {
      console.error('Error saving banners.json:', err);
    }
    return false;
  }
}

/**
 * Appends a new banner image.
 */
export function addBanner(imageUrl: string, title?: string, link?: string): BannerItem {
  const banners = getBanners();
  const newBanner: BannerItem = {
    id: `banner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    image_url: imageUrl,
    title: title || '',
    link: link || '/products',
    created_at: new Date().toISOString(),
  };
  banners.push(newBanner);
  saveBanners(banners);
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
  
  // If not matched by string id, check if numeric array index was passed
  if (updated.length === initialLength) {
    const num = Number(id);
    if (!isNaN(num) && num >= 0 && num < banners.length) {
      updated = banners.filter((_, idx) => idx !== num);
    }
  }

  saveBanners(updated);
  return true;
}

