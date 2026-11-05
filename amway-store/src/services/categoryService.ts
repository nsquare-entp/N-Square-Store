import fs from 'fs';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';

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
    icon: '🥗',
    description: 'Nutrilite foundational vitamins, protein powders, dietary supplements, and authentic Ayurvedic wellness formulations.',
    order: 1,
    parentId: null,
  },
  {
    id: 'beauty',
    name: 'Beauty',
    icon: '✨',
    description: 'Artistry prestige skincare, targeted serums, dermatological treatments, and radiant cosmetics.',
    order: 2,
    parentId: null,
  },
  {
    id: 'personal_care',
    name: 'Personal Care',
    icon: '🧴',
    description: 'G&H botanical body care, Glister total oral care solutions, and Satinique salon-grade hair care.',
    order: 3,
    parentId: null,
  },
  {
    id: 'home_living',
    name: 'Home & Living',
    icon: '🏡',
    description: 'Amway Queen premium cookware, Atmosphere air treatment systems, and concentrated eco-friendly cleaning.',
    order: 4,
    parentId: null,
  },
  {
    id: 'others',
    name: 'Others',
    icon: '📦',
    description: 'Specialized health accessories, fitness tools, dispensers, and wellness literature.',
    order: 5,
    parentId: null,
  },

  // Subcategories under Nutritional
  {
    id: 'category1',
    name: 'Protein Powders',
    icon: '💪',
    description: 'Foundational macro-nutrition and targeted sports protein formulations designed to support positive nitrogen balance and muscle recovery.',
    order: 1,
    parentId: 'nutritional',
  },
  {
    id: 'category2',
    name: 'Weight Management',
    icon: '⚖️',
    description: 'Metabolic weight management, prebiotic soluble fiber, and balanced meal replacements.',
    order: 2,
    parentId: 'nutritional',
  },
  {
    id: 'category3',
    name: 'Daily Supplements',
    icon: '💊',
    description: 'Essential multivitamins, calcium, minerals, and targeted daily micronutrient formulations.',
    order: 3,
    parentId: 'nutritional',
  },
  {
    id: 'category4',
    name: 'Nutritional Gummies',
    icon: '🍓',
    description: 'Delicious pectin-based chewable vitamins and lifestyle nutrition gummies.',
    order: 4,
    parentId: 'nutritional',
  },
  {
    id: 'category5',
    name: 'Traditional Herbs',
    icon: '🌿',
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

export function getGlobalCategories(forceReload: boolean = false): GlobalCategory[] {
  if (!forceReload && globalThis.__nsquare_categories_cache__) {
    return globalThis.__nsquare_categories_cache__;
  }

  const filePath = getCategoriesFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalThis.__nsquare_categories_cache__ = parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
        return globalThis.__nsquare_categories_cache__;
      }
    } catch (e) {
      console.error('[CategoryService] Error reading categories.json:', e);
    }
  }

  globalThis.__nsquare_categories_cache__ = DEFAULT_CATEGORIES;
  saveGlobalCategories(globalThis.__nsquare_categories_cache__);
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
    icon: input.icon?.trim() || '🏷️',
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
    return true;
  }
  return false;
}
