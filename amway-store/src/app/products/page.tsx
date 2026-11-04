import { getCatalog } from '../../services/catalogService';
import { getGlobalCategories } from '../../services/categoryService';
import ProductsPageClient from '../../components/ProductsPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Products Catalog | N-Square Store',
  description: 'Explore authentic Amway nutrition, wellness, personal care, beauty, and home living products with direct regional dispatch.',
};

export default function ProductsPage() {
  const products = getCatalog();
  const categories = getGlobalCategories();

  return (
    <ProductsPageClient
      initialProducts={products}
      initialCategories={categories}
    />
  );
}

