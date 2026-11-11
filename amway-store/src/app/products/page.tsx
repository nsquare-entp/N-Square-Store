import { getCatalog, syncCatalogFromSupabase } from '../../services/catalogService';
import { getGlobalCategories, syncCategoriesFromSupabase } from '../../services/categoryService';
import { isSupabaseConfigured } from '../../utils/supabase';
import ProductsPageClient from '../../components/ProductsPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Products Catalog | N-Square Store',
  description: 'Explore authentic Amway nutrition, wellness, personal care, beauty, and home living products with direct regional dispatch.',
};

export default async function ProductsPage() {
  let products = getCatalog();
  if ((!products || products.length === 0) && isSupabaseConfigured) {
    const synced = await syncCatalogFromSupabase();
    if (synced && synced.length > 0) products = synced;
  }

  let categories = getGlobalCategories();
  if ((!categories || categories.length === 0) && isSupabaseConfigured) {
    const syncedCats = await syncCategoriesFromSupabase();
    if (syncedCats && syncedCats.length > 0) categories = syncedCats;
  }

  return (
    <ProductsPageClient
      initialProducts={products}
      initialCategories={categories}
    />
  );
}
