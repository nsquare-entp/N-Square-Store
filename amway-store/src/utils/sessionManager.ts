/**
 * N-Square Store Session Manager
 * Seamless session state management across product browsing, details, cart, profile, and admin studio.
 */

export interface CatalogSessionState {
  parentCategory: string;
  subcategory: string;
  searchQuery: string;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'name';
  scrollY: number;
  timestamp: number;
}

export interface NavigationOrigin {
  path: string;
  label: string;
}

export interface AdminSessionState {
  activeTab?: string;
  selectedUserId?: string;
  studioDetailTab?: 'orders' | 'profile' | 'requests';
  filterTag?: 'ALL' | 'NEEDS_ACTION' | 'ACTIVE' | 'VIP' | 'SUSPENDED';
  userSearchQuery?: string;
  catalogSearchQuery?: string;
}

const KEYS = {
  CATALOG_SESSION: 'nsquare_catalog_session',
  NAV_ORIGIN: 'nsquare_nav_origin',
  ADMIN_SESSION: 'nsquare_admin_session',
  PROFILE_TAB: 'nsquare_profile_tab',
};

// ============================================================================
// 1. PRODUCTS CATALOG SESSION (FILTERS, SEARCH, SCROLL POSITION)
// ============================================================================

export function saveCatalogSession(state: Partial<CatalogSessionState>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCatalogSession();
    const updated: CatalogSessionState = {
      parentCategory: state.parentCategory ?? existing?.parentCategory ?? 'all',
      subcategory: state.subcategory ?? existing?.subcategory ?? 'all',
      searchQuery: state.searchQuery ?? existing?.searchQuery ?? '',
      sortBy: state.sortBy ?? existing?.sortBy ?? 'featured',
      scrollY: state.scrollY !== undefined ? state.scrollY : (typeof window !== 'undefined' ? window.scrollY : 0),
      timestamp: Date.now(),
    };
    sessionStorage.setItem(KEYS.CATALOG_SESSION, JSON.stringify(updated));
  } catch (e) {
    console.warn('[SessionManager] Failed to save catalog session:', e);
  }
}

export function getCatalogSession(): CatalogSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEYS.CATALOG_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire session after 2 hours
    if (parsed.timestamp && Date.now() - parsed.timestamp > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem(KEYS.CATALOG_SESSION);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCatalogSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(KEYS.CATALOG_SESSION);
  } catch {}
}

// ============================================================================
// 2. NAVIGATION ORIGIN TRACKING (INTELLIGENT "BACK" ROUTING)
// ============================================================================

export function recordNavigationOrigin(path: string, label: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEYS.NAV_ORIGIN, JSON.stringify({ path, label, timestamp: Date.now() }));
  } catch {}
}

export function getNavigationOrigin(): NavigationOrigin | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEYS.NAV_ORIGIN);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { path: data.path, label: data.label };
  } catch {
    return null;
  }
}

// ============================================================================
// 3. ADMIN STUDIO SESSION (ACTIVE TAB, SELECTED USER, DETAIL TAB, FILTERS)
// ============================================================================

export function saveAdminSession(updates: Partial<AdminSessionState>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getAdminSession() || {};
    const merged = { ...existing, ...updates };
    sessionStorage.setItem(KEYS.ADMIN_SESSION, JSON.stringify(merged));
  } catch {}
}

export function getAdminSession(): AdminSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEYS.ADMIN_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ============================================================================
// 4. CUSTOMER PROFILE SESSION (ACTIVE TAB)
// ============================================================================

export function saveProfileTabSession(tab: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEYS.PROFILE_TAB, tab);
  } catch {}
}

export function getProfileTabSession(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(KEYS.PROFILE_TAB);
  } catch {
    return null;
  }
}

