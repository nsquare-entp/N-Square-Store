import React, { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductById } from '../../../../services/catalogService';
import ProductGalleryClient from '../../../../components/ProductGalleryClient';

interface ProductGalleryPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductGalleryPage({ params }: ProductGalleryPageProps) {
  const { id } = await params;
  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">
          Loading Packaging Visualizer...
        </div>
      }
    >
      <ProductGalleryClient product={product} />
    </Suspense>
  );
}

