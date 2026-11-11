import fs from 'fs';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';
import { supabase, getSupabaseAdmin, isSupabaseConfigured } from '../utils/supabase';

export interface GlobalCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  order: number;
  parentId?: string | null;
}

export interface CategoryNode extends GlobalCategory {
  children: GlobalCategory[];
}

const DEFAULT_CATEGORIES: GlobalCategory[] = [
  // Top-Level Parent Categories
  {
    id: 'nutritional',
    name: 'Nutritional',
    icon: 'HeartPulse',
    description: 'Nutrilite foundational vitamins, protein powders, dietary supplements, and authentic Ayurvedic wellness formulations.',
    order: 1,
    parentId: null,
  },
  {
    id: 'beauty',
    name: 'Beauty',
    icon: 'Sparkles',
    description: 'Artistry prestige skincare, targeted serums, dermatological treatments, and radiant cosmetics.',
    order: 2,
    parentId: null,
  },
  {
    id: 'personal_care',
    name: 'Personal Care',
    icon: 'Droplets',
    description: 'G&H botanical body care, Glister total oral care solutions, and Satinique salon-grade hair care.',
    order: 3,
    parentId: null,
  },
  {
    id: 'home_living',
    name: 'Home & Living',
    icon: 'Home',
    description: 'Amway Queen premium cookware, Atmosphere air treatment systems, and concentrated eco-friendly cleaning.',
    order: 4,
    parentId: null,
  },
  {
    id: 'others',
    name: 'Others',
    icon: 'Package',
    description: 'Specialized health accessories, fitness tools, dispensers, and wellness literature.',
    order: 5,
    parentId: null,
  },

  // Subcategories under Nutritional
  {
    id: 'category1',
    name: 'Protein Powders',
    icon: 'Dumbbell',
    description: 'Foundational macro-nutrition and targeted sports protein formulations designed to support positive nitrogen balance and muscle recovery.',
    order: 1,
    parentId: 'nutritional',
  },
  {
    id: 'category2',
    name: 'Weight Management',
    icon: 'Scale',
    description: 'Metabolic weight management, prebiotic soluble fiber, and balanced meal replacements.',
    order: 2,
    parentId: 'nutritional',
  },
  {
    id: 'category3',
    name: 'Daily Supplements',
    icon: 'Pill',
    description: 'Essential multivitamins, calcium, minerals, and targeted daily micronutrient formulations.',
    order: 3,
    parentId: 'nutritional',
  },
  {
    id: 'category4',
    name: 'Nutritional Gummies',
    icon: 'Heart',
    description: 'Delicious pectin-based chewable vitamins and lifestyle nutrition gummies.',
    order: 4,
    parentId: 'nutritional',
  },
  {
    id: 'category5',
    name: 'Traditional Herbs',
    icon: 'Leaf',
    description: 'Authentic DNA-fingerprinted Ayurvedic and botanical wellness formulations.',
    order: 5,
    parentId: 'nutritional',
  },
];

function getCategoriesFilePath(): string {
  return getDataFilePath('categories.json');
}

declare global {
  // eslint-disable-next-line no-var
  var __nsquare_categories_cache__: GlobalCategory[] | undefined;
}

let lastCategoriesSyncTimestamp = 0;
const CATEGORIES_SYNC_TTL_MS = 60 * 1000;
let isSyncingCategories = false;

function mapCategoryToRow(c: GlobalCategory) {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon || 'Tag',
    description: c.description || '',
    sort_order: c.order || 0,
    parent_id: c.parentId || null,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToCategory(row: any): GlobalCategory {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || 'Tag',
    description: row.description || '',
    order: Number(row.sort_order) || 0,
    parentId: row.parent_id || null,
  };
}

/**
 * Sync categories from Supabase (SWR pattern)
 */
export async function syncCategoriesFromSupabase(): Promise<GlobalCategory[]> {
  if (!isSupabaseConfigured) return getGlobalCategories();
  try {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (error || !data || data.length === 0) {
      return getGlobalCategories();
    }

    const mapped = data.map(mapRowToCategory);
    globalThis.__nsquare_categories_cache__ = mapped.sort((a, b) => (a.order || 0) - (b.order || 0));
    lastCategoriesSyncTimestamp = Date.now();

    const filePath = getCategoriesFilePath();
    atomicWriteJson(filePath, globalThis.__nsquare_categories_cache__);
    return globalThis.__nsquare_categories_cache__;
  } catch (err: any) {
    console.warn('[CategoryService] Supabase sync note:', err?.message || err);
    return getGlobalCategories();
  }
}

export function getGlobalCategories(forceReload: boolean = false): GlobalCategory[] {
  if (!forceReload && globalThis.__nsquare_categories_cache__ && globalThis.__nsquare_categories_cache__.length > 0) {
    // SWR trigger
    const now = Date.now();
    if (isSupabaseConfigured && !isSyncingCategories && now - lastCategoriesSyncTimestamp > CATEGORIES_SYNC_TTL_MS) {
      isSyncingCategories = true;
      syncCategoriesFromSupabase().finally(() => {
        isSyncingCategories = false;
      });
    }
    return globalThis.__nsquare_categories_cache__;
  }

  const filePath = getCategoriesFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__nsquare_categories_cache__ = parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    } catch (e) {
      console.error('[CategoryService] Error reading categories.json:', e);
    }
  }

  if (!globalThis.__nsquare_categories_cache__ || globalThis.__nsquare_categories_cache__.length === 0) {
    globalThis.__nsquare_categories_cache__ = DEFAULT_CATEGORIES;
    try {
      saveGlobalCategories(globalThis.__nsquare_categories_cache__);
    } catch {}
  }

  // Trigger SWR sync
  const now = Date.now();
  if (isSupabaseConfigured && !isSyncingCategories && now - lastCategoriesSyncTimestamp > CATEGORIES_SYNC_TTL_MS) {
    isSyncingCategories = true;
    syncCategoriesFromSupabase().finally(() => {
      isSyncingCategories = false;
    });
  }

  return globalThis.__nsquare_categories_cache__;
}

export function saveGlobalCategories(categories: GlobalCategory[]): void {
  globalThis.__nsquare_categories_cache__ = categories.sort((a, b) => (a.order || 0) - (b.order || 0));
  const filePath = getCategoriesFilePath();
  try {
    atomicWriteJson(filePath, globalThis.__nsquare_categories_cache__);
  } catch (e: any) {
    if (e?.code !== 'EROFS' && e?.code !== 'EACCES') {
      console.error('[CategoryService] Error saving categories.json:', e);
    }
  }

  // Write-through to Supabase
  if (isSupabaseConfigured && categories.length > 0) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        const rows = categories.map(mapCategoryToRow);
        await admin.from('categories').upsert(rows, { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[CategoryService] Supabase sync error on saveGlobalCategories:', e?.message || e);
      }
    })();
  }
}

export function getParentCategories(categoriesList?: GlobalCategory[]): GlobalCategory[] {
  const list = categoriesList || getGlobalCategories();
  return list.filter((c) => !c.parentId || c.parentId === 'root');
}

export function getSubcategories(parentId: string, categoriesList?: GlobalCategory[]): GlobalCategory[] {
  const list = categoriesList || getGlobalCategories();
  return list.filter((c) => c.parentId === parentId);
}

export function getCategoryHierarchy(categoriesList?: GlobalCategory[]): CategoryNode[] {
  const list = categoriesList || getGlobalCategories();
  const parents = getParentCategories(list);
  return parents.map((p) => ({
    ...p,
    children: list.filter((c) => c.parentId === p.id),
  }));
}

export function upsertGlobalCategory(input: Partial<GlobalCategory> & { name: string }): GlobalCategory {
  const categories = getGlobalCategories();
  const id = input.id?.trim() || `cat_${Date.now().toString(36)}`;
  const existingIdx = categories.findIndex((c) => c.id === id);

  const newCategory: GlobalCategory = {
    id,
    name: input.name.trim(),
    icon: input.icon?.trim() || 'Tag',
    description: input.description?.trim() || '',
    order: input.order !== undefined ? input.order : existingIdx >= 0 ? categories[existingIdx].order : categories.length + 1,
    parentId: input.parentId !== undefined ? (input.parentId === '' ? null : input.parentId) : existingIdx >= 0 ? categories[existingIdx].parentId : null,
  };

  if (existingIdx >= 0) {
    categories[existingIdx] = newCategory;
  } else {
    categories.push(newCategory);
  }

  saveGlobalCategories(categories);
  return newCategory;
}

export function deleteGlobalCategory(id: string): boolean {
  const categories = getGlobalCategories();
  const initialLength = categories.length;

  // Also remove or detach children if deleting a parent
  const filtered = categories
    .filter((c) => c.id !== id)
    .map((c) => (c.parentId === id ? { ...c, parentId: null } : c));

  if (filtered.length < initialLength) {
    saveGlobalCategories(filtered);

    // Delete in Supabase
    if (isSupabaseConfigured) {
      (async () => {
        try {
          const admin = getSupabaseAdmin();
          await admin.from('categories').delete().eq('id', id);
        } catch (e: any) {
          console.warn('[CategoryService] Supabase sync error on deleteGlobalCategory:', e?.message || e);
        }
      })();
    }

    return true;
  }
  return false;
}
