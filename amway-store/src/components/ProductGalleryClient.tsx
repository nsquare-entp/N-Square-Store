'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShoppingCart,
  Check,
} from 'lucide-react';
import { CatalogProduct } from '../services/catalogService';
import { useCartStore } from '../store/useCartStore';

interface ProductGalleryClientProps {
  product: CatalogProduct;
}

export default function ProductGalleryClient({ product }: ProductGalleryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addItem = useCartStore((state) => state.addItem);

  // Extract images
  const imagesList = product.images && product.images.length > 0
    ? product.images
    : [product.image];

  // Parse initial image index from URL query param "?img=X"
  const requestedIdx = Number(searchParams?.get('img') || '0');
  const safeInitialIdx = !isNaN(requestedIdx) && requestedIdx >= 0 && requestedIdx < imagesList.length
    ? requestedIdx
    : 0;

  const [activeIdx, setActiveIdx] = useState(safeInitialIdx);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [addedToast, setAddedToast] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan when image changes
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleSelectImage = (idx: number) => {
    setActiveIdx(idx);
    resetZoom();
  };

  const handleNextImage = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % imagesList.length);
    resetZoom();
  }, [imagesList.length, resetZoom]);

  const handlePrevImage = useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + imagesList.length) % imagesList.length);
    resetZoom();
  }, [imagesList.length, resetZoom]);

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3.5, Number((prev + 0.5).toFixed(1))));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(1)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.preventDefault();
    if (zoom > 1) {
      resetZoom();
    } else {
      setZoom(2);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'Escape') {
        router.push(`/product/${product.id}`);
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextImage, handlePrevImage, product.id, router]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))));
    } else {
      setZoom((z) => {
        const next = Math.max(1, Number((z - 0.25).toFixed(2)));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse Drag to Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag to Pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Add to cart from gallery view
  const handleAddToCart = () => {
    const variant = product.variants?.[0];
    addItem({
      id: product.id,
      sku: variant?.sku || product.sku,
      name: product.name,
      price: variant?.price || product.price,
      mrp: variant?.mrp || product.mrp,
      image: imagesList[activeIdx] || product.image,
      variant: variant?.weight || product.weight,
      qty: 1,
    });
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbStripRef.current) {
      const activeBtn = thumbStripRef.current.children[activeIdx] as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeIdx]);

  const currentImgUrl = imagesList[activeIdx] || product.image;

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col justify-between select-none overflow-hidden">
      {/* 1. Clean White Header Toolbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push(`/product/${product.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0 border border-slate-200"
            aria-label="Back to Product Details"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Product</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[200px] sm:max-w-md">
              {product.name}
            </h1>
            <div className="text-[10px] text-teal-700 font-mono font-bold mt-0.5">
              <span>SKU: {product.sku || product.id}</span>
            </div>
          </div>
        </div>

        {/* Right Header: Pricing & Quick Add to Cart */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-sm font-black text-emerald-800 hidden min-[480px]:inline">
            ₹{product.price.toLocaleString('en-IN')}
          </span>

          <button
            onClick={handleAddToCart}
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-800 to-emerald-700 hover:from-teal-900 hover:to-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add to Cart</span>
          </button>
        </div>
      </header>

      {/* 2. Main Interactive Zoom Stage (White Background) */}
      <main
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-slate-50/40 min-h-[55vh] sm:min-h-[65vh] ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
      >
        {/* Navigation Arrow Left */}
        {imagesList.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevImage();
            }}
            className="absolute left-3 sm:left-6 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center border border-slate-200/90 shadow-md transition-all cursor-pointer backdrop-blur-xs active:scale-95"
            aria-label="Previous image"
            title="Previous Image (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Navigation Arrow Right */}
        {imagesList.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextImage();
            }}
            className="absolute right-3 sm:right-6 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center border border-slate-200/90 shadow-md transition-all cursor-pointer backdrop-blur-xs active:scale-95"
            aria-label="Next image"
            title="Next Image (Right Arrow)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Floating Zoom Controls Bar */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md text-xs">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            disabled={zoom <= 1}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="font-mono font-bold text-[11px] px-2 text-teal-900 min-w-[46px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            disabled={zoom >= 3.5}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {zoom > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
              }}
              className="w-8 h-8 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 flex items-center justify-center transition-colors cursor-pointer ml-1 border border-teal-200/70"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* The Scaled / Panned Image Stage */}
        <div
          onClick={handleToggleZoom}
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            src={currentImgUrl}
            alt={product.name}
            className="max-h-[62vh] sm:max-h-[72vh] max-w-[88vw] object-contain filter drop-shadow-md pointer-events-none"
            onError={(e: any) => {
              e.target.src = 'https://placehold.co/600x600/F0FDFA/0F766E?text=Amway+Product';
            }}
          />
        </div>

        {/* Added to Cart Feedback Toast */}
        {addedToast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-emerald-700 text-white px-4 py-2 rounded-2xl shadow-xl border border-emerald-500 text-xs font-bold flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>Added 1 item to cart!</span>
          </div>
        )}
      </main>

      {/* 3. Bottom Horizontal Product Images List (Clean White, Zero Unwanted Text) */}
      <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2.5 px-3 sm:py-3 shrink-0 shadow-sm">
        {/* Thumbnail Strip with Full Headroom & Zero Clipping */}
        <div className="w-full max-w-4xl mx-auto overflow-hidden">
          <div
            ref={thumbStripRef}
            className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto touch-scroll py-2 px-2 no-scrollbar justify-center"
          >
            {imagesList.map((img, idx) => {
              const isActive = activeIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectImage(idx)}
                  className={`relative w-13 h-13 sm:w-15 sm:h-15 shrink-0 rounded-2xl p-1.5 transition-all cursor-pointer bg-white flex items-center justify-center ${
                    isActive
                      ? 'border-2 border-teal-700 ring-2 ring-teal-500/30 shadow-sm ring-offset-2 ring-offset-white'
                      : 'border border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
                  }`}
                  title={`Packaging view ${idx + 1}`}
                  aria-label={`Packaging view ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-contain"
                  />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-700 border-2 border-white shadow-xs" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
