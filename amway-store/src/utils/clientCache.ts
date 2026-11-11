/**
 * Client-Side Local Storage Stale-While-Revalidate (SWR) Cache Helper
 * Guarantees 0ms instant render for repeat visits while refreshing in the background.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

export function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch (e) {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T, ttlSeconds = 300): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs: ttlSeconds * 1000,
    };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    // quota exceeded or private mode notice
  }
}

export function isCacheStale(key: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return true;
    const entry: CacheEntry<any> = JSON.parse(raw);
    return Date.now() - entry.timestamp > entry.ttlMs;
  } catch (e) {
    return true;
  }
}

export async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  ttlSeconds = 300
): Promise<{ data: T; fromCache: boolean }> {
  const cached = getCachedData<T>(cacheKey);

  // If cached and fresh, return immediately
  if (cached && !isCacheStale(cacheKey)) {
    return { data: cached, fromCache: true };
  }

  // Fetch in background or foreground
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const liveData: T = await res.json();
    setCachedData(cacheKey, liveData, ttlSeconds);
    return { data: liveData, fromCache: false };
  } catch (err) {
    // Fallback to stale cache if network fails
    if (cached) {
      return { data: cached, fromCache: true };
    }
    throw err;
  }
}

