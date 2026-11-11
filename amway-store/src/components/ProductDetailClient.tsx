'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  MessageSquare,
  Package,
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  FileText,
  FlaskConical,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  ZoomIn,
  Share2,
} from 'lucide-react';
import { CatalogProduct } from '../services/catalogService';
import { useCartStore } from '../store/useCartStore';
import { SOCIAL_LINKS, getWhatsAppContactUrl } from '../config/social';
import { getNavigationOrigin, NavigationOrigin } from '../utils/sessionManager';

interface ProductDetailClientProps {
  product: CatalogProduct;
}

interface StockState {
  loading: boolean;
  inStock: boolean;
  stockLevel: number | null;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  label: string;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'usage' | 'ingredients' | 'specs' | 'faqs'>('overview');
  const [openMobileAccordion, setOpenMobileAccordion] = useState<string | null>('overview');
  const [addedToast, setAddedToast] = useState(false);
  const [navOrigin, setNavOrigin] = useState<NavigationOrigin | null>(null);

  useEffect(() => {
    const origin = getNavigationOrigin();
    if (origin) {
      setNavOrigin(origin);
    }
  }, []);

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

  const initialVariantIdx = Math.max(
    0,
    variants.findIndex((v) => v.sku.toLowerCase() === (product.sku || '').toLowerCase())
  );
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(initialVariantIdx >= 0 ? initialVariantIdx : 0);
  const currentVariant = variants[selectedVariantIdx] || variants[0];

  const toggleMobileAccordion = (key: string) => {
    setOpenMobileAccordion((prev) => (prev === key ? null : key));
  };

  // Live Stock State
  const [stock, setStock] = useState<StockState>({
    loading: true,
    inStock: true,
    stockLevel: null,
    status: 'IN_STOCK',
    label: 'Checking stock...',
  });

  // Desktop Tabs horizontal scroll indicator and arrows
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Variant strip horizontal scroll indicator
  const variantsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollVariantsLeft, setCanScrollVariantsLeft] = useState(false);
  const [canScrollVariantsRight, setCanScrollVariantsRight] = useState(false);

  // Thumbnails scroll
  const thumbContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollThumbsLeft, setCanScrollThumbsLeft] = useState(false);
  const [canScrollThumbsRight, setCanScrollThumbsRight] = useState(false);

  const checkTabScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkTabScroll, 300);
    }
  };

  const checkVariantScroll = () => {
    if (variantsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = variantsContainerRef.current;
      setCanScrollVariantsLeft(scrollLeft > 8);
      setCanScrollVariantsRight(scrollLeft < scrollWidth - clientWidth - 8);
    }
  };

  const handleScrollVariants = (direction: 'left' | 'right') => {
    if (variantsContainerRef.current) {
      const offset = direction === 'left' ? -180 : 180;
      variantsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkVariantScroll, 300);
    }
  };

  const checkThumbScroll = () => {
    if (thumbContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = thumbContainerRef.current;
      setCanScrollThumbsLeft(scrollLeft > 6);
      setCanScrollThumbsRight(scrollLeft < scrollWidth - clientWidth - 6);
    }
  };

  const handleScrollThumbs = (direction: 'left' | 'right') => {
    if (thumbContainerRef.current) {
      const offset = direction === 'left' ? -120 : 120;
      thumbContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkThumbScroll, 300);
    }
  };

  useEffect(() => {
    checkTabScroll();
    checkVariantScroll();
    checkThumbScroll();
    window.addEventListener('resize', checkTabScroll);
    window.addEventListener('resize', checkVariantScroll);
    window.addEventListener('resize', checkThumbScroll);
    return () => {
      window.removeEventListener('resize', checkTabScroll);
      window.removeEventListener('resize', checkVariantScroll);
      window.removeEventListener('resize', checkThumbScroll);
    };
  }, [variants.length]);

  // Live stock fetch on product or variant selection
  useEffect(() => {
    let isMounted = true;
    const skuToFetch = currentVariant.sku || product.sku || product.id;
    setStock((s) => ({ ...s, loading: true, label: 'Checking stock...' }));

    fetch(`/api/stock?sku=${encodeURIComponent(skuToFetch)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.stock) {
          setStock({
            loading: false,
            inStock: data.stock.inStock,
            stockLevel: data.stock.stockLevel,
            status: data.stock.status || 'IN_STOCK',
            label: data.stock.label || (data.stock.inStock ? 'In Stock' : 'Temporarily Out of Stock'),
          });
        } else {
          setStock({
            loading: false,
            inStock: true,
            stockLevel: null,
            status: 'IN_STOCK',
            label: 'In Stock',
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setStock({
          loading: false,
          inStock: true,
          stockLevel: null,
          status: 'IN_STOCK',
          label: 'In Stock',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [currentVariant.sku, product.sku, product.id]);

  const imagesList = product.images && product.images.length > 0 
    ? product.images 
    : [product.image];

  const currentImage = imagesList[selectedImageIdx] || product.image;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      sku: currentVariant.sku,
      name: product.name,
      price: currentVariant.price,
      mrp: currentVariant.mrp,
      image: currentImage,
      variant: currentVariant.weight,
      qty: quantity,
    });
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const [shareToast, setShareToast] = useState(false);

  const handleBackNavigation = () => {
    if (navOrigin?.path) {
      router.push(navOrigin.path);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push('/products');
    }
  };

  const handleShareProduct = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `https://nsquarestore.com/product/${product.id}`;
    const shareData = {
      title: product.name,
      text: `${product.name} - Direct Selling Price: ₹${currentVariant.price}`,
      url: url,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled share
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      }
    } catch (e) {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(`${product.name}\n${url}`)}`;
      window.open(waUrl, '_blank');
    }
  };

  const discountPercent = currentVariant.mrp > currentVariant.price
    ? Math.round(((currentVariant.mrp - currentVariant.price) / currentVariant.mrp) * 100)
    : 0;

  const displayCategory = product.category || 'Wellness & Health';

  // Shared Component: Product Title, Badges & USP
  const TitleSection = (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-teal-900 uppercase tracking-wider bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-lg">
            {product.parentCategory && product.parentCategory.toLowerCase() !== displayCategory.toLowerCase()
              ? `${product.parentCategory} • ${displayCategory}`
              : displayCategory}
          </span>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
            SKU: {currentVariant.sku || product.sku || product.id}
          </span>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
            Net Content: {currentVariant.weight || product.weight}
          </span>
        </div>

        {/* Quick Share Action */}
        <button
          onClick={handleShareProduct}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-900 bg-white hover:bg-teal-50 px-3 py-1 rounded-xl border border-slate-200 hover:border-teal-300 shadow-2xs transition-colors cursor-pointer shrink-0"
          title="Share product via WhatsApp / Social"
        >
          <Share2 className="w-3.5 h-3.5 text-teal-700" />
          <span>Share</span>
        </button>
      </div>

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 leading-tight">
        {product.name}
      </h1>

      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
        {product.usp || 'Authentic formulation manufactured to the highest quality standards by Amway.'}
      </p>
    </div>
  );

  // Shared Component: Horizontally Aligned Variants & Pricing Matrix
  const VariantsAndPricingSection = (
    <div className="space-y-4">
      {/* Pack Size / Quantity Comparison (Horizontally Aligned & Compact Sizing) */}
      {variants.length > 1 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 min-w-0 shrink-0">
              <Package className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="whitespace-nowrap font-extrabold">Pack Size / Quantity</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 shrink-0">
                {variants.length} Sizes Available
              </span>
              {/* Optional scroll buttons for variants if needed */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleScrollVariants('left')}
                  disabled={!canScrollVariantsLeft}
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    canScrollVariantsLeft ? 'text-teal-800 border-slate-300 hover:bg-slate-100' : 'text-slate-300 opacity-20 pointer-events-none'
                  }`}
                  aria-label="Scroll sizes left"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleScrollVariants('right')}
                  disabled={!canScrollVariantsRight}
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    canScrollVariantsRight ? 'text-teal-800 border-slate-300 hover:bg-slate-100' : 'text-slate-300 opacity-20 pointer-events-none'
                  }`}
                  aria-label="Scroll sizes right"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontally Aligned Variant Cards */}
          <div className="relative w-full max-w-full overflow-visible">
            <div
              ref={variantsContainerRef}
              onScroll={checkVariantScroll}
              className="flex items-stretch gap-2.5 overflow-x-auto touch-scroll no-scrollbar scroll-smooth pt-5 pb-3 px-2 w-full"
            >
              {variants.map((v, idx) => {
                const isSelected = selectedVariantIdx === idx;
                const isBestValue = idx === variants.length - 1 && variants.length > 1;

                return (
                  <button
                    key={v.sku || idx}
                    type="button"
                    onClick={() => setSelectedVariantIdx(idx)}
                    className={`relative text-left p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer flex-1 min-w-[130px] sm:min-w-[150px] max-w-[210px] flex flex-col justify-between shrink-0 ${
                      isSelected
                        ? 'border-teal-700 bg-gradient-to-br from-teal-50/90 via-emerald-50/40 to-white shadow-md ring-2 ring-teal-600/20'
                        : 'border-slate-200 hover:border-teal-300 bg-white hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    {isBestValue && (
                      <span className="absolute -top-2.5 right-2 bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs z-10 whitespace-nowrap ring-1 ring-white">
                        Best Value
                      </span>
                    )}

                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        {v.weight}
                      </span>
                      {isSelected ? (
                        <span className="w-4 h-4 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          ✓
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 bg-slate-50 shrink-0" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-black text-sm sm:text-base text-teal-950">
                          ₹{v.price.toLocaleString('en-IN')}
                        </span>
                        {v.mrp > v.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            ₹{v.mrp.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {v.savings > 0 && (
                        <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                          <span>Save ₹{v.savings.toLocaleString('en-IN')}</span>
                          <span className="bg-emerald-100/80 text-emerald-900 text-[9px] font-black px-1 rounded">
                            {v.discountPercent}% OFF
                          </span>
                        </div>
                      )}

                      <div className="text-[9px] font-mono text-slate-400 truncate">
                        {v.sku}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {canScrollVariantsRight && (
              <div className="sm:hidden flex items-center justify-end px-1 pt-0.5 text-[9px] text-teal-800 font-bold gap-1 animate-pulse">
                <span>More pack sizes</span>
                <span>➔</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Matrix */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-50/70 via-emerald-50/40 to-slate-50 border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Direct Selling Price ({currentVariant.weight})
          </div>
          <div className="flex items-baseline gap-2 sm:gap-3 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-teal-950">
              ₹{currentVariant.price.toLocaleString('en-IN')}
            </span>
            {currentVariant.mrp > currentVariant.price && (
              <span className="text-xs sm:text-sm text-slate-400 line-through font-medium">
                MRP ₹{currentVariant.mrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {currentVariant.savings > 0 && (
          <div className="flex flex-col items-start sm:items-end">
            <span className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] sm:text-xs shadow-2xs whitespace-nowrap">
              Direct Selling Discount: Save ₹{currentVariant.savings.toLocaleString('en-IN')} ({currentVariant.discountPercent}% OFF)
            </span>
            <span className="text-[10px] text-slate-500 mt-1">
              Direct door-to-door delivery
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // Shared Component: Checkout Stepper & Add to Cart (Side-by-Side)
  const CheckoutSection = (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quantity Stepper Side-by-Side */}
        <div className="flex items-center justify-between bg-slate-100 rounded-2xl p-1 border border-slate-200/90 w-28 sm:w-36 shrink-0 min-h-[46px]">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-8 sm:w-10 h-8 sm:h-9 rounded-xl bg-white text-slate-700 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs text-base sm:text-lg active:scale-95"
            title="Decrease quantity"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="font-black text-slate-900 text-sm sm:text-base px-1 select-none">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="w-8 sm:w-10 h-8 sm:h-9 rounded-xl bg-white text-slate-700 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs text-base sm:text-lg active:scale-95"
            title="Increase quantity"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Primary Add to Cart Button Side-by-Side */}
        <button
          type="button"
          onClick={handleAddToCart}
          id="add-to-cart-button"
          className="flex-1 py-3 px-3 sm:px-6 rounded-2xl bg-gradient-to-r from-teal-800 to-emerald-700 hover:from-teal-900 hover:to-emerald-800 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-h-[46px]"
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span className="truncate">Add {quantity > 1 ? `${quantity} Units` : ''} to Cart</span>
        </button>
      </div>

      {/* View Cart Button */}
      <Link
        href="/cart"
        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors text-center border border-slate-200/80 min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
      >
        <ShoppingCart className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>View Cart</span>
      </Link>

      {/* Confirmation Toast */}
      {addedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between animate-fade-in">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>Added to cart successfully!</span>
          </span>
          <Link href="/cart" className="underline font-black flex items-center gap-1">
            <span>Proceed to Cart</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );

  // Shared Component: Assurance & WhatsApp Consultation Card
  const AssuranceAndContactSection = (
    <div className="space-y-3.5">
      {/* Genuine Amway Fulfillment Assurance Card */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white rounded-2xl p-4 flex items-center gap-3.5 shadow-xs border border-teal-800/40">
        <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="text-xs">
          <div className="font-bold text-teal-200">100% Genuine Amway Product</div>
          <div className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
            Authentic factory-sealed product dispatched directly from Amway India regional distribution hubs.
          </div>
        </div>
      </div>

      {/* Product Consultation & Social Clarification Card */}
      <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <p className="font-extrabold text-slate-900">Need clarification about this product?</p>
          <p className="text-[11px] text-slate-500">Connect with an Amway wellness specialist for dosage, routine advice, or order inquiries.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <a
            href={getWhatsAppContactUrl(`Hi N-Square Official, I would like guidance on ${product.name} (${currentVariant.weight}):`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
          <a
            href={SOCIAL_LINKS.youtubeUrl || 'https://www.youtube.com/@N_Square_Official'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#cc0000] hover:bg-[#b30000] text-white font-bold text-xs shadow-2xs transition-all"
            title="Watch on YouTube"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>YouTube</span>
          </a>
          <a
            href={SOCIAL_LINKS.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-95 text-white font-bold text-xs shadow-2xs"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
            </svg>
            <span>Instagram</span>
          </a>
          <a
            href={SOCIAL_LINKS.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0077b5] hover:bg-[#006097] text-white font-bold text-xs shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 1 0 1.6 1.6 1.6 1.6 0 0 0-1.6-1.6Z"/>
            </svg>
            <span>LinkedIn</span>
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 sm:space-y-8 animate-fade-in">
      {/* 1. Fully Responsive Breadcrumb Navigation & Top Actions */}
      <div className="w-full flex items-center justify-between gap-2.5 pb-2 border-b border-slate-200/80 max-w-full">
        <button
          onClick={handleBackNavigation}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal-800 hover:text-teal-950 transition-colors bg-white px-3 py-1.5 sm:py-2 rounded-xl border border-teal-200 shadow-2xs cursor-pointer w-fit shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to {navOrigin?.label || 'Products'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            onClick={handleShareProduct}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-teal-900 bg-white hover:bg-teal-50 px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 hover:border-teal-300 shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Share this product"
          >
            <Share2 className="w-3.5 h-3.5 text-teal-700" />
            <span className="hidden sm:inline">Share Product</span>
            <span className="sm:hidden">Share</span>
          </button>

          <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium shrink-0">
            <Link href="/" className="hover:text-teal-700 shrink-0">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/products" className="hover:text-teal-700 shrink-0">Products</Link>
          </nav>
        </div>
      </div>

      {/* Share Toast Notification */}
      {shareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Product link copied to clipboard!</span>
        </div>
      )}
          <span className="text-slate-300">/</span>
          {product.parentCategory && product.parentCategory.toLowerCase() !== displayCategory.toLowerCase() && (
            <>
              <Link href={`/products?category=${encodeURIComponent(product.parentCategoryId || product.parentCategory)}`} className="text-teal-800 font-semibold hover:underline shrink-0">
                {product.parentCategory}
              </Link>
              <span className="text-slate-300">/</span>
            </>
          )}
          <span className="text-teal-800 font-bold shrink-0">{displayCategory}</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 truncate max-w-[140px] sm:max-w-[220px] font-semibold">{product.name}</span>
        </nav>
      </div>

      {/* 2. MOBILE & TABLET LAYOUT (< lg screens)
          Exact requested order:
          1. Images
          2. Title
          3. Variants & Pricing
          4. Checkout
          5. Other Details (Assurance, WhatsApp, Detailed Accordions)
      */}
      <div className="lg:hidden space-y-5">
        {/* Step 1: Product Images & Packaging Stage */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col items-center justify-center overflow-hidden">
          {/* Live Stock Badge */}
          <div className="w-full flex items-center justify-between mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                stock.status === 'OUT_OF_STOCK'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : stock.status === 'LOW_STOCK'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  stock.loading
                    ? 'bg-slate-400 animate-ping'
                    : stock.status === 'OUT_OF_STOCK'
                    ? 'bg-rose-500'
                    : stock.status === 'LOW_STOCK'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
              <span>{stock.label}</span>
            </span>
          </div>

          {/* Main Image Stage (Clickable -> Dedicated Gallery & Zoom Page) */}
          <Link
            href={`/product/${product.id}/gallery?img=${selectedImageIdx}`}
            className="relative w-full h-64 sm:h-80 flex items-center justify-center p-2 group cursor-zoom-in"
            title="Click to open packaging images in full-screen & zoom"
          >
            <img
              src={currentImage}
              alt={product.name}
              className="max-h-full max-w-full object-contain filter drop-shadow-md transition-all duration-300 group-hover:scale-105"
              onError={(e: any) => {
                e.target.src = 'https://placehold.co/400x400/F0FDFA/0F766E?text=Amway';
              }}
            />
            {/* Zoom Badge Indicator */}
            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1.5 transition-all shadow-xs group-hover:bg-teal-900">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Tap to Zoom</span>
            </div>
          </Link>

          {/* Packaging Multi-Angle Switcher (Zero Clipping) */}
          {imagesList.length > 1 && (
            <div className="w-full mt-3 pt-3 border-t border-slate-100 relative">
              <div
                ref={thumbContainerRef}
                onScroll={checkThumbScroll}
                className="flex items-center gap-2.5 overflow-x-auto touch-scroll py-2 px-2 no-scrollbar justify-center w-full"
              >
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`w-12 h-12 shrink-0 rounded-xl border p-1 transition-all bg-white cursor-pointer ${
                      selectedImageIdx === idx
                        ? 'border-teal-700 ring-2 ring-teal-500/50 shadow-xs ring-offset-1'
                        : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                    title={`View packaging image ${idx + 1}`}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Product Title & Badges */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm max-w-full overflow-hidden">
          {TitleSection}
        </div>

        {/* Step 3: Variants & Pricing Matrix */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm max-w-full overflow-visible">
          {VariantsAndPricingSection}
        </div>

        {/* Step 4: Checkout Actions */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm max-w-full overflow-visible">
          {CheckoutSection}
        </div>

        {/* Step 5: Other Details (Assurance & WhatsApp) */}
        <div>
          {AssuranceAndContactSection}
        </div>

        {/* Step 6: Detailed Information Accordions for Mobile/Tablet */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-teal-800" />
            <h3 className="font-extrabold text-slate-900 text-sm">Detailed Product Information</h3>
          </div>

          {/* Accordion 1: Overview */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <button
              onClick={() => toggleMobileAccordion('overview')}
              className="w-full p-3.5 flex items-center justify-between text-left font-bold text-slate-900 text-xs bg-slate-50/80 hover:bg-teal-50/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-teal-700" />
                <span>Product Overview</span>
              </span>
              <span className="text-teal-700 font-black text-xs">
                {openMobileAccordion === 'overview' ? '▲' : '▼'}
              </span>
            </button>
            {openMobileAccordion === 'overview' && (
              <div className="p-3.5 border-t border-slate-100 space-y-3 text-xs leading-relaxed animate-fade-in">
                {product.officialDetails?.detailsHtml ? (
                  <div
                    className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 text-slate-700"
                    dangerouslySetInnerHTML={{ __html: product.officialDetails.detailsHtml }}
                  />
                ) : (
                  <p>{product.usp || 'Authentic formulation manufactured to the highest quality standards by Amway.'}</p>
                )}

                {product.officialDetails?.classifications && product.officialDetails.classifications.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-teal-950 mb-1.5 uppercase tracking-wider">
                      Certifications:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {product.officialDetails.classifications.flatMap((c) =>
                        c.values.map((v, i) => (
                          <span
                            key={`${c.name}-${i}`}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-bold text-[11px]"
                          >
                            <span>✓</span>
                            <span>{v}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Accordion 2: Features & Benefits */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <button
              onClick={() => toggleMobileAccordion('features')}
              className="w-full p-3.5 flex items-center justify-between text-left font-bold text-slate-900 text-xs bg-slate-50/80 hover:bg-teal-50/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>Key Features &amp; Benefits</span>
              </span>
              <span className="text-teal-700 font-black text-xs">
                {openMobileAccordion === 'features' ? '▲' : '▼'}
              </span>
            </button>
            {openMobileAccordion === 'features' && (
              <div className="p-3.5 border-t border-slate-100 space-y-3 text-xs leading-relaxed animate-fade-in">
                {product.officialDetails?.featuresHtml && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900">Official Features:</h4>
                    <div
                      className="[&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 text-slate-700"
                      dangerouslySetInnerHTML={{ __html: product.officialDetails.featuresHtml }}
                    />
                  </div>
                )}
                {product.officialDetails?.benefitsHtml && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <h4 className="font-bold text-emerald-950">Official Health Benefits:</h4>
                    <div
                      className="[&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 text-slate-800"
                      dangerouslySetInnerHTML={{ __html: product.officialDetails.benefitsHtml }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Accordion 3: How to Use */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <button
              onClick={() => toggleMobileAccordion('usage')}
              className="w-full p-3.5 flex items-center justify-between text-left font-bold text-slate-900 text-xs bg-slate-50/80 hover:bg-teal-50/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                <span>How to Use &amp; Dosage</span>
              </span>
              <span className="text-teal-700 font-black text-xs">
                {openMobileAccordion === 'usage' ? '▲' : '▼'}
              </span>
            </button>
            {openMobileAccordion === 'usage' && (
              <div className="p-3.5 border-t border-slate-100 space-y-3 text-xs leading-relaxed animate-fade-in">
                {product.officialDetails?.howToUseHtml ? (
                  <div
                    className="[&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 text-slate-700"
                    dangerouslySetInnerHTML={{ __html: product.officialDetails.howToUseHtml }}
                  />
                ) : (
                  <p className="text-slate-700">
                    Consume as directed on official packaging label. Store in cool, dry place.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Accordion 4: Ingredients & Nutrition */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <button
              onClick={() => toggleMobileAccordion('ingredients')}
              className="w-full p-3.5 flex items-center justify-between text-left font-bold text-slate-900 text-xs bg-slate-50/80 hover:bg-teal-50/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FlaskConical className="w-3.5 h-3.5 text-teal-700" />
                <span>Ingredients &amp; Nutrition Facts</span>
              </span>
              <span className="text-teal-700 font-black text-xs">
                {openMobileAccordion === 'ingredients' ? '▲' : '▼'}
              </span>
            </button>
            {openMobileAccordion === 'ingredients' && (
              <div className="p-3.5 border-t border-slate-100 space-y-3 text-xs animate-fade-in">
                {product.officialDetails?.ingredientsData?.preText && (
                  <div
                    className="p-3 bg-slate-50 rounded-xl text-slate-800"
                    dangerouslySetInnerHTML={{ __html: product.officialDetails.ingredientsData.preText }}
                  />
                )}

                {product.officialDetails?.ingredientsData?.specificationTable &&
                  product.officialDetails.ingredientsData.specificationTable.length > 0 && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-teal-900 text-white p-2.5 font-bold text-[11px] flex items-center justify-between">
                        <span>Nutritional Table (ICMR RDA)</span>
                        <span className="text-teal-200 text-[10px]">Approx.</span>
                      </div>
                      <div className="text-[10px] text-teal-800 font-semibold p-1.5 bg-teal-50/80 border-b border-teal-100 flex items-center justify-between">
                        <span>Swipe horizontally for full % RDA</span>
                        <span>↔</span>
                      </div>
                      <div className="overflow-x-auto touch-scroll">
                        <table className="w-full text-left text-[11px] min-w-[300px]">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2 font-black text-slate-900">Nutrient</th>
                              <th className="p-2">Per Serving</th>
                              <th className="p-2">% RDA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {product.officialDetails.ingredientsData.specificationTable.map((row, idx) => (
                              <tr key={idx}>
                                <td className="p-2 font-semibold text-slate-900">{row.ingredientName}</td>
                                <td className="p-2 text-slate-700">{row.values?.[0]?.value || '-'}</td>
                                <td className="p-2 font-bold text-teal-800">{row.values?.[1]?.value || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {product.officialDetails?.ingredientsData?.postText && (
                  <div
                    className="p-3 bg-teal-50/50 rounded-xl border border-teal-200 text-[11px] text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: product.officialDetails.ingredientsData.postText }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Accordion 5: Packaging & Manufacturer */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <button
              onClick={() => toggleMobileAccordion('specs')}
              className="w-full p-3.5 flex items-center justify-between text-left font-bold text-slate-900 text-xs bg-slate-50/80 hover:bg-teal-50/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-teal-700" />
                <span>Packaging &amp; Manufacturer Details</span>
              </span>
              <span className="text-teal-700 font-black text-xs">
                {openMobileAccordion === 'specs' ? '▲' : '▼'}
              </span>
            </button>
            {openMobileAccordion === 'specs' && (
              <div className="p-3.5 border-t border-slate-100 space-y-3 text-xs animate-fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-500 font-medium">SKU</div>
                    <div className="text-xs font-black text-slate-900 mt-0.5">{product.sku || product.id}</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-500 font-medium">Net Quantity</div>
                    <div className="text-xs font-black text-slate-900 mt-0.5">{product.weight}</div>
                  </div>
                </div>

                {product.officialDetails?.manufacturingDetails && (
                  <div
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed [&_label]:font-bold [&_label]:text-slate-800 [&_div]:mt-1.5 [&_a]:text-teal-700 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: product.officialDetails.manufacturingDetails }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Accordion 6: FAQs */}
          {product.officialDetails?.faqs && product.officialDetails.faqs.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => toggleMobileAccordion('faqs')}
                className="w-full p-3.5 flex items-center justify-between text-left font-bold text-slate-900 text-xs bg-slate-50/80 hover:bg-teal-50/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
                  <span>Official FAQs ({product.officialDetails.faqs.length})</span>
                </span>
                <span className="text-teal-700 font-black text-xs">
                  {openMobileAccordion === 'faqs' ? '▲' : '▼'}
                </span>
              </button>
              {openMobileAccordion === 'faqs' && (
                <div className="p-3.5 border-t border-slate-100 space-y-2.5 text-xs animate-fade-in">
                  {product.officialDetails.faqs.map((faq, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-900 text-xs flex items-start gap-1.5">
                        <span className="text-teal-700 font-black">Q.</span>
                        <span>{faq.question}</span>
                      </div>
                      <div className="text-slate-600 pl-3 leading-relaxed text-[11px]">
                        {faq.answer}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. DESKTOP TWO-COLUMN SHOWCASE (lg:grid lg:grid-cols-12) */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Visual Showcase & Genuine Packaging (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col items-center justify-center overflow-hidden">
            {/* Top Stock Badge */}
            <div className="w-full flex items-center justify-between mb-4">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  stock.status === 'OUT_OF_STOCK'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : stock.status === 'LOW_STOCK'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    stock.loading
                      ? 'bg-slate-400 animate-ping'
                      : stock.status === 'OUT_OF_STOCK'
                      ? 'bg-rose-500'
                      : stock.status === 'LOW_STOCK'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span>{stock.label}</span>
              </span>
            </div>

            {/* Main Image Stage (Clickable -> Dedicated Gallery & Zoom Page) */}
            <Link
              href={`/product/${product.id}/gallery?img=${selectedImageIdx}`}
              className="relative w-full h-80 md:h-96 flex items-center justify-center p-4 group cursor-zoom-in"
              title="Click to view packaging and zoom images in full-screen"
            >
              <img
                src={currentImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain filter drop-shadow-md transition-all duration-300 group-hover:scale-105"
                onError={(e: any) => {
                  e.target.src = 'https://placehold.co/400x400/F0FDFA/0F766E?text=Amway';
                }}
              />
              {/* Zoom Badge Indicator */}
              <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition-all shadow-xs group-hover:bg-teal-900">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Click to Zoom &amp; Inspect</span>
              </div>
            </Link>

            {/* Packaging Multi-Angle Switcher (Zero Clipping) */}
            {imagesList.length > 1 && (
              <div className="flex items-center gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-slate-100 overflow-x-auto touch-scroll py-2 px-2 no-scrollbar justify-center w-full">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl border p-1 sm:p-1.5 transition-all bg-white cursor-pointer ${
                      selectedImageIdx === idx
                        ? 'border-teal-700 ring-2 ring-teal-500/50 shadow-xs ring-offset-1'
                        : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                    title={`View packaging image ${idx + 1}`}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Left Column Extras: Assurance & WhatsApp */}
          {AssuranceAndContactSection}
        </div>

        {/* Right Column: Pricing, Ordering & Tabs (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Main Info Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
            {TitleSection}
            {VariantsAndPricingSection}
            {CheckoutSection}
          </div>

          {/* Desktop Product Information Tabs */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            {/* Desktop Tabs Header with Left & Right Arrow Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 relative">
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={() => handleScrollTabs('left')}
                disabled={!canScrollLeft}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  canScrollLeft
                    ? 'border-teal-300 bg-white text-teal-800 hover:bg-teal-50 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-300 opacity-40 cursor-not-allowed'
                }`}
                aria-label="Scroll tabs left"
                title="Previous tabs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Scrollable Tabs Track */}
              <div
                ref={tabsContainerRef}
                onScroll={checkTabScroll}
                className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
              >
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'overview'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'features'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Features &amp; Benefits</span>
                </button>
                <button
                  onClick={() => setActiveTab('usage')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'usage'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>How to Use</span>
                </button>
                <button
                  onClick={() => setActiveTab('ingredients')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'ingredients'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Ingredients &amp; Facts</span>
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'specs'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Packaging &amp; Specs</span>
                </button>
                {product.officialDetails?.faqs && product.officialDetails.faqs.length > 0 && (
                  <button
                    onClick={() => setActiveTab('faqs')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      activeTab === 'faqs'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>FAQs ({product.officialDetails.faqs.length})</span>
                  </button>
                )}
              </div>

              {/* Right Arrow Button */}
              <button
                type="button"
                onClick={() => handleScrollTabs('right')}
                disabled={!canScrollRight}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  canScrollRight
                    ? 'border-teal-400 bg-white text-teal-900 hover:bg-teal-50 shadow-xs ring-2 ring-teal-200/60'
                    : 'border-slate-200 bg-slate-50 text-slate-300 opacity-40 cursor-not-allowed'
                }`}
                aria-label="Scroll tabs right"
                title="Next tabs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Desktop Active Tab Body */}
            <div>
              {activeTab === 'overview' && (
                <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {product.officialDetails?.detailsHtml ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-2.5 text-sm">Official Amway Product Overview:</h3>
                      <div
                        className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 text-slate-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: product.officialDetails.detailsHtml }}
                      />
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-2 text-sm">About this Formulation:</h3>
                      <p>{product.usp || 'Authentic formulation manufactured to the highest quality standards by Amway.'}</p>
                    </div>
                  )}

                  {product.officialDetails?.classifications && product.officialDetails.classifications.length > 0 && (
                    <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200">
                      <h4 className="font-bold text-teal-950 text-xs uppercase tracking-wider mb-2.5">
                        Verified Product Certifications:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {product.officialDetails.classifications.flatMap((c) =>
                          c.values.map((v, i) => (
                            <span
                              key={`${c.name}-${i}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-teal-300 text-teal-900 font-bold text-xs shadow-2xs"
                            >
                              <span>✓</span>
                              <span>{v}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'features' && (
                <div className="space-y-4">
                  {product.officialDetails?.featuresHtml && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <h3 className="font-bold text-slate-900 text-sm">Official Key Features:</h3>
                      <div
                        className="[&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_li:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-slate-900 text-xs sm:text-sm text-slate-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: product.officialDetails.featuresHtml }}
                      />
                    </div>
                  )}

                  {product.officialDetails?.benefitsHtml && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                      <h3 className="font-bold text-emerald-950 text-sm">Official Benefits:</h3>
                      <div
                        className="[&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_li:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-emerald-950 text-xs sm:text-sm text-slate-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: product.officialDetails.benefitsHtml }}
                      />
                    </div>
                  )}

                  {!product.officialDetails?.featuresHtml && !product.officialDetails?.benefitsHtml && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <h3 className="font-bold text-slate-900 text-sm mb-2">Highlights:</h3>
                      <p className="text-xs text-slate-700 leading-relaxed">{product.usp}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'usage' && (
                <div className="space-y-4">
                  {product.officialDetails?.howToUseHtml ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <h3 className="font-bold text-slate-900 text-sm">Official Usage Instructions &amp; Directions:</h3>
                      <div
                        className="[&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 [&_strong]:font-bold [&_strong]:text-slate-900 text-xs sm:text-sm text-slate-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: product.officialDetails.howToUseHtml }}
                      />
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <h3 className="font-bold text-slate-900 text-sm">Recommended Usage Instructions:</h3>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Consume as directed on the official product label. Keep container tightly closed after use. Store in a cool, dry place away from direct sunlight.
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <strong>Notice:</strong> Health supplements should not be used as a substitute for a varied and balanced diet.
                  </div>
                </div>
              )}

              {activeTab === 'ingredients' && (
                <div className="space-y-4">
                  {product.officialDetails?.ingredientsData ? (
                    <>
                      {product.officialDetails.ingredientsData.preText && (
                        <div
                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium [&_p]:mb-1 [&_strong]:font-bold [&_strong]:text-slate-950"
                          dangerouslySetInnerHTML={{ __html: product.officialDetails.ingredientsData.preText }}
                        />
                      )}

                      {product.officialDetails.ingredientsData.specificationTable &&
                        product.officialDetails.ingredientsData.specificationTable.length > 0 && (
                          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                            <div className="bg-teal-900 text-white p-3 font-bold text-xs flex items-center justify-between">
                              <span>Nutritional Information &amp; ICMR RDA Guidelines</span>
                              <span className="text-[11px] text-teal-200 font-normal">Approx. Values</span>
                            </div>
                            <div className="overflow-x-auto touch-scroll">
                              <table className="w-full text-left text-xs min-w-[340px]">
                                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="p-2.5 sm:p-3 font-black text-slate-900">Nutrient</th>
                                    <th className="p-2.5 sm:p-3">Per Serving</th>
                                    <th className="p-2.5 sm:p-3">% RDA (Adult Men)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {product.officialDetails.ingredientsData.specificationTable.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-teal-50/30 transition-colors">
                                      <td className="p-2.5 sm:p-3 font-semibold text-slate-900">{row.ingredientName}</td>
                                      <td className="p-2.5 sm:p-3 text-slate-700">{row.values?.[0]?.value || '-'}</td>
                                      <td className="p-2.5 sm:p-3 font-bold text-teal-800">{row.values?.[1]?.value || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                      {product.officialDetails.ingredientsData.postText && (
                        <div
                          className="p-3.5 bg-teal-50/50 rounded-xl border border-teal-200 text-xs text-slate-700 leading-relaxed [&_p]:mb-1"
                          dangerouslySetInnerHTML={{ __html: product.officialDetails.ingredientsData.postText }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <h3 className="font-bold text-slate-900 text-sm mb-2">Ingredients:</h3>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Formulated with premium ingredients adhering to Amway global botanical and nutritional standards.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'specs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Product Code / SKU</div>
                      <div className="text-sm font-black text-slate-900 mt-1">{product.sku || product.id}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Net Quantity</div>
                      <div className="text-sm font-black text-slate-900 mt-1">{product.weight}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Category</div>
                      <div className="text-sm font-black text-slate-900 mt-1">
                        {product.parentCategory && product.parentCategory.toLowerCase() !== displayCategory.toLowerCase()
                          ? `${product.parentCategory} > ${displayCategory}`
                          : displayCategory}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Stock Status</div>
                      <div className={`text-sm font-black mt-1 ${stock.status === 'OUT_OF_STOCK' ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {stock.inStock ? 'Available' : 'Out of Stock'}
                      </div>
                    </div>
                  </div>

                  {product.pack_sizes && product.pack_sizes.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-700 mb-2">Available Pack Sizes:</div>
                      <div className="flex flex-wrap gap-2">
                        {product.pack_sizes.map((size, idx) => (
                          <span key={idx} className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs">
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.officialDetails?.manufacturingDetails && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                        Official Manufacturer &amp; Regulatory Details:
                      </h4>
                      <div
                        className="text-xs text-slate-600 leading-relaxed [&_label]:font-bold [&_label]:text-slate-800 [&_div]:mt-1.5 [&_a]:text-teal-700 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: product.officialDetails.manufacturingDetails }}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'faqs' && product.officialDetails?.faqs && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">
                    Official Frequently Asked Questions:
                  </h3>
                  {product.officialDetails.faqs.map((faq, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-900 text-xs flex items-start gap-2">
                        <span className="text-teal-700 font-black">Q.</span>
                        <span>{faq.question}</span>
                      </div>
                      <div className="text-xs text-slate-600 pl-4 leading-relaxed">
                        {faq.answer}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
