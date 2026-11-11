import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductById, syncCatalogFromSupabase } from '../../../services/catalogService';
import { isSupabaseConfigured } from '../../../utils/supabase';
import ProductDetailClient from '../../../components/ProductDetailClient';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  let product = getProductById(id);

  if (!product && isSupabaseConfigured) {
    await syncCatalogFromSupabase();
    product = getProductById(id);
  }

  if (!product) {
    return {
      title: 'Product Details | N-Square Official Store',
      description: 'Explore authentic Amway nutrition, wellness, and beauty products.',
    };
  }

  // Ensure absolute image URL for WhatsApp / social preview scrapers
  const rawImage = product.image || product.images?.[0] || '';
  const absoluteImage = rawImage.startsWith('http')
    ? rawImage
    : `https://nsquarestore.com${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

  const cleanDescription = product.usp ||
    `${product.name} - MRP ₹${product.mrp} | Direct Selling Price ₹${product.price}. Authentic Amway formulation with verified factory dispatch.`;

  return {
    title: `${product.name} | N-Square Official Amway Partner`,
    description: cleanDescription,
    openGraph: {
      title: `${product.name} - Direct Amway Partner`,
      description: cleanDescription,
      url: `/product/${product.id}`,
      siteName: 'N-Square Official Store',
      images: [
        {
          url: absoluteImage,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: cleanDescription,
      images: [absoluteImage],
    },
  };
}

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
            href="/products"
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
