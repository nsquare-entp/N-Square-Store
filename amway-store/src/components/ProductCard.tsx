'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '../store/useCartStore';
import { CatalogProduct } from '../services/catalogService';
import { saveCatalogSession, recordNavigationOrigin } from '../utils/sessionManager';

interface ProductCardProps {
  product: CatalogProduct;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export default function ProductCard({ product, stockStatus = 'IN_STOCK' }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // Grouped Quantity Variants
  const variants = product.variants && product.variants.length > 0
    ? product.variants
    : [
        {
          sku: product.sku,
          weight: product.weight,
          price: product.price,
          mrp: product.mrp,
          savings: product.savings,
          discountPercent: product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0,
        },
      ];

  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const currentVariant = variants[selectedVariantIdx] || variants[0];

  const handleProductClick = () => {
    if (typeof window !== 'undefined') {
      saveCatalogSession({ scrollY: window.scrollY });
      const currentPath = window.location.pathname + window.location.search;
      recordNavigationOrigin(currentPath || '/products', 'Products Catalog');
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      sku: currentVariant.sku,
      name: product.name,
      price: currentVariant.price,
      mrp: currentVariant.mrp,
      image: product.image,
      variant: currentVariant.weight,
    });
  };

  const discountPercent = currentVariant.mrp > currentVariant.price
    ? Math.round(((currentVariant.mrp - currentVariant.price) / currentVariant.mrp) * 100)
    : 0;

  const currentImage = product.images?.[activeImgIdx] || product.image;

  // Format clean customer-friendly category label
  const displayCategory = product.category || product.parentCategory || 'Nutritional';

  return (
    <div className="group relative flex flex-col justify-between bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-teal-400 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden h-full">
      {/* Top Media Section */}
      <div className="relative flex flex-col bg-gradient-to-b from-slate-50/80 to-white">
        {/* Badges Overlay */}
        <div className="w-full flex items-center justify-between gap-1 p-2.5 sm:p-3.5 pb-1">
          {/* Stock Availability Pill */}
          <span 
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
              stockStatus === 'OUT_OF_STOCK'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : stockStatus === 'LOW_STOCK'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              stockStatus === 'OUT_OF_STOCK' ? 'bg-rose-500' : stockStatus === 'LOW_STOCK' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <span>{stockStatus === 'OUT_OF_STOCK' ? 'Out of Stock' : stockStatus === 'LOW_STOCK' ? 'Low Stock' : 'In Stock'}</span>
          </span>

          {variants.length > 1 && (
            <span className="text-[9px] sm:text-[10px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">
              {variants.length} Sizes
            </span>
          )}
        </div>

        {/* Product Image with Hover Zoom */}
        <Link
          href={`/product/${product.id}`}
          onClick={handleProductClick}
          className="w-full flex justify-center py-2 px-3 sm:px-4"
        >
          <div className="relative w-full h-36 min-[480px]:h-40 sm:h-44 flex items-center justify-center overflow-hidden rounded-xl bg-white p-2">
            <img
              src={currentImage}
              alt={product.name}
              className="max-h-full max-w-full object-contain transform group-hover:scale-108 transition-transform duration-300"
              onError={(e: any) => {
                e.target.src = 'https://placehold.co/300x300/F0FDFA/0F766E?text=Amway';
              }}
            />
          </div>
        </Link>

        {/* Multi-angle Mini Thumbnails */}
        <div className="flex gap-1.5 justify-center py-1 min-h-[32px] px-2 overflow-x-auto no-scrollbar">
          {product.images && product.images.length > 1 ? (
            product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImgIdx(idx);
                }}
                className={`w-6 h-6 rounded-md border p-0.5 transition-all cursor-pointer ${
                  activeImgIdx === idx 
                    ? 'border-teal-600 ring-2 ring-teal-400/80 shadow-2xs' 
                    : 'border-slate-200 opacity-60 hover:opacity-100'
                }`}
                title={`View angle ${idx + 1}`}
              >
                <img src={img} alt="thumb" className="w-full h-full object-contain" />
              </button>
            ))
          ) : null}
        </div>
      </div>

      {/* Product Details Section */}
      <div className="px-3 sm:px-4 pt-1 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Weight Tags */}
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-teal-800 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-md truncate max-w-[130px] sm:max-w-[150px]">
              {displayCategory}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold flex-shrink-0">
              {currentVariant.weight}
            </span>
          </div>

          {/* Product Name */}
          <Link
            href={`/product/${product.id}`}
            onClick={handleProductClick}
            className="block group-hover:text-teal-700 transition-colors"
          >
            <h3 className="font-bold text-xs min-[480px]:text-sm text-slate-900 line-clamp-2 min-h-[2.5rem] leading-snug mb-1" title={product.name}>
              {product.name}
            </h3>
          </Link>

          {/* Official Description */}
          <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 min-h-[2rem] leading-relaxed mb-2">
            {product.usp || 'Authentic Amway formulation with verified factory sealed packaging.'}
          </p>

          {/* Interactive Pack Size / Quantity Chips (Grouped Variants) */}
          {variants.length > 1 && (
            <div className="mb-2.5">
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-1.5">Available Sizes:</div>
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {variants.map((v, vIdx) => {
                  const isSelected = selectedVariantIdx === vIdx;
                  return (
                    <button
                      key={v.sku || vIdx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedVariantIdx(vIdx);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-teal-900 text-white shadow-xs border border-teal-900 ring-2 ring-teal-600/30 font-extrabold'
                          : 'bg-slate-100 hover:bg-teal-50 text-slate-700 border border-slate-200 hover:border-teal-300'
                      }`}
                      title={`Select ${v.weight} - ₹${v.price}`}
                    >
                      {v.weight}
                    </button>
                  );
                })}
              </div>
            </div>
          )}


        </div>

        {/* Pricing & Add To Cart Button Area */}
        <div className="pt-2.5 pb-3 sm:pb-4 border-t border-slate-100">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Direct Selling Price</div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-extrabold text-teal-900">
                  ₹{currentVariant.price.toLocaleString('en-IN')}
                </span>
                {currentVariant.mrp > currentVariant.price && (
                  <span className="text-[10px] sm:text-xs text-slate-400 line-through">
                    ₹{currentVariant.mrp.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
            {currentVariant.savings > 0 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap">
                Save ₹{currentVariant.savings.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <Link
              href={`/product/${product.id}`}
              className="w-full text-center py-2 px-1 text-[11px] sm:text-xs font-bold text-teal-800 bg-white hover:bg-teal-50 rounded-xl transition-colors border border-teal-200 min-h-[38px] flex items-center justify-center"
            >
              View Details
            </Link>
            <button
              onClick={handleQuickAdd}
              id={`quick-add-${product.id}`}
              className="w-full py-2 px-1 text-[11px] sm:text-xs font-bold text-white bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 active:scale-95 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[38px]"
            >
              <span>+</span>
              <span>Quick Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
