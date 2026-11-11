import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductById, syncCatalogFromSupabase } from '../../../services/catalogService';
import { isSupabaseConfigured } from '../../../utils/supabase';
import ProductDetailClient from '../../../components/ProductDetailClient';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  let product = getProductById(id);

  if (!product && isSupabaseConfigured) {
    await syncCatalogFromSupabase();
    product = getProductById(id);
  }

  if (!product) {
    return (
      <div className="w-full max-w-2xl mx-auto my-16 bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mx-auto">
          ⚠️
        </div>
        <h2 className="text-2xl font-black text-slate-900">Clinical Formulation Not Found</h2>
        <p className="text-sm text-slate-600">
          We could not locate product SKU or ID <strong className="text-slate-900">"{id}"</strong> in the verified Amway catalog.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-800 text-white font-bold text-sm hover:bg-teal-900 transition-colors"
          >
            ← Return to Storefront Catalog
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetailClient product={product} />;
}
