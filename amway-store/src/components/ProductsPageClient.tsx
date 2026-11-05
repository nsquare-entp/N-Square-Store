'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, Check, Layers, Search, Folder, Tag, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';
import CategoryIcon from './CategoryIcon';
import { CatalogProduct } from '../services/catalogService';
import { GlobalCategory } from '../services/categoryService';
import Link from 'next/link';

const SORT_OPTIONS: { value: 'featured' | 'price-asc' | 'price-desc' | 'name'; label: string }[] = [
  { value: 'featured', label: 'Featured Catalog' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Product Name (A-Z)' },
];
import {
  saveCatalogSession,
  getCatalogSession,
  recordNavigationOrigin,
} from '../utils/sessionManager';

interface ProductsPageClientProps {
  initialProducts: CatalogProduct[];
  initialCategories?: GlobalCategory[];
}

export default function ProductsPageClient({
  initialProducts,
  initialCategories = [],
}: ProductsPageClientProps) {
  const router = useRouter();
  const [products] = useState<CatalogProduct[]>(initialProducts || []);
  const [categories, setCategories] = useState<GlobalCategory[]>(initialCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, any>>({});

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Department Bar horizontal scrolling
  const deptBarRef = useRef<HTMLDivElement>(null);
  const [canScrollDeptLeft, setCanScrollDeptLeft] = useState(false);
  const [canScrollDeptRight, setCanScrollDeptRight] = useState(true);

  const checkDeptScroll = () => {
    if (deptBarRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = deptBarRef.current;
      setCanScrollDeptLeft(scrollLeft > 10);
      setCanScrollDeptRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const handleScrollDept = (direction: 'left' | 'right') => {
    if (deptBarRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      deptBarRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkDeptScroll, 300);
    }
  };

  useEffect(() => {
    checkDeptScroll();
    window.addEventListener('resize', checkDeptScroll);
    return () => window.removeEventListener('resize', checkDeptScroll);
  }, [categories]);

  // Split categories into parent departments and subcategories
  const parentCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId || c.parentId === 'root');
  }, [categories]);

  const subcategoriesMap = useMemo(() => {
    const map: Record<string, GlobalCategory[]> = {};
    categories.forEach((c) => {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    });
    return map;
  }, [categories]);

  // Current active subcategories list (only for a specifically selected department; hidden when "All Departments" is active)
  const activeSubcategories = useMemo(() => {
    if (selectedParentCategory === 'all') {
      return [];
    }
    return subcategoriesMap[selectedParentCategory] || [];
  }, [selectedParentCategory, subcategoriesMap]);

  // Fetch stock cache on client mount, restore session or read URL search params
  useEffect(() => {
    recordNavigationOrigin('/products', 'Products Catalog');

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q') || params.get('search');
      const cat = params.get('category');
      if (q) {
        setSearchQuery(q);
        setShowDropdown(true);
      }
      if (cat) {
        const foundParent = parentCategories.find(
          (p) => p.id === cat || p.name.toLowerCase() === cat.toLowerCase()
        );
        if (foundParent) {
          setSelectedParentCategory(foundParent.id);
          setSelectedSubcategory('all');
        } else {
          // Check if it's a subcategory
          const foundSub = categories.find(
            (c) => c.id === cat || c.name.toLowerCase() === cat.toLowerCase()
          );
          if (foundSub && foundSub.parentId) {
            setSelectedParentCategory(foundSub.parentId);
            setSelectedSubcategory(foundSub.id);
          }
        }
      }

      // If no explicit query parameters were in URL, restore from saved catalog session
      if (!q && !cat) {
        const saved = getCatalogSession();
        if (saved) {
          if (saved.searchQuery) setSearchQuery(saved.searchQuery);
          if (saved.parentCategory) setSelectedParentCategory(saved.parentCategory);
          if (saved.subcategory) setSelectedSubcategory(saved.subcategory);
          if (saved.sortBy) setSortBy(saved.sortBy);
          if (saved.scrollY && saved.scrollY > 0) {
            setTimeout(() => {
              window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
            }, 60);
          }
        }
      }
    }

    fetch('/api/stock')
      .then((r) => r.json())
      .then((data) => {
        if (data.stock) {
          setStockMap(data.stock);
        }
      })
      .catch((e) => console.log('Stock fetch notice:', e));
  }, [parentCategories, categories]);

  // Dynamic categories revalidation and sync
  useEffect(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});

    const handleCategoriesUpdate = (e: Event) => {
      const custom = e as CustomEvent<GlobalCategory[]>;
      if (custom.detail && Array.isArray(custom.detail)) {
        setCategories(custom.detail);
      }
    };
    window.addEventListener('nsquare_categories_updated', handleCategoriesUpdate);
    return () => window.removeEventListener('nsquare_categories_updated', handleCategoriesUpdate);
  }, []);

  // Persist filter & search state changes to session
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveCatalogSession({
      parentCategory: selectedParentCategory,
      subcategory: selectedSubcategory,
      searchQuery,
      sortBy,
      scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    });
  }, [selectedParentCategory, selectedSubcategory, searchQuery, sortBy]);

  // Track scroll position seamlessly
  useEffect(() => {
    let scrollTimer: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        saveCatalogSession({ scrollY: window.scrollY });
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Handle outside click to close autocomplete dropdown and sort dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete suggestions (min 2 chars, limit 6)
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    return products
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const catMatch = (p.category || '').toLowerCase().includes(q);
        const parentMatch = (p.parentCategory || '').toLowerCase().includes(q);
        const skuMatch = (p.sku || p.id || '').toLowerCase().includes(q);
        return nameMatch || catMatch || parentMatch || skuMatch;
      })
      .slice(0, 6);
  }, [products, searchQuery]);

  // Main filtered & sorted products for grid
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // 1. Parent category filter
        if (selectedParentCategory !== 'all') {
          const activeParentObj = parentCategories.find((c) => c.id === selectedParentCategory);
          const pName = activeParentObj ? activeParentObj.name.toLowerCase() : selectedParentCategory.toLowerCase();

          const matchParent =
            p.parentCategoryId === selectedParentCategory ||
            (p.parentCategory && p.parentCategory.toLowerCase() === pName) ||
            p.categoryId === selectedParentCategory ||
            (p.category && p.category.toLowerCase() === pName);

          if (!matchParent) return false;
        }

        // 2. Subcategory filter
        if (selectedSubcategory !== 'all') {
          const activeSubObj = categories.find((c) => c.id === selectedSubcategory);
          const sName = activeSubObj ? activeSubObj.name.toLowerCase() : selectedSubcategory.toLowerCase();

          const matchSub =
            p.categoryId === selectedSubcategory ||
            (p.category &&
              (p.category.toLowerCase() === sName ||
                p.category.toLowerCase().includes(sName) ||
                sName.includes(p.category.toLowerCase())));

          if (!matchSub) return false;
        }

        // 3. Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchUsp = (p.usp || '').toLowerCase().includes(q);
          const matchCat = (p.category || '').toLowerCase().includes(q);
          const matchParent = (p.parentCategory || '').toLowerCase().includes(q);
          const matchSku = (p.sku || p.id || '').toLowerCase().includes(q);
          if (!matchName && !matchUsp && !matchCat && !matchParent && !matchSku) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0; // featured default order
      });
  }, [products, selectedParentCategory, selectedSubcategory, searchQuery, sortBy, parentCategories, categories]);

  const handleSelectSuggestion = (product: CatalogProduct) => {
    setShowDropdown(false);
    if (typeof window !== 'undefined') {
      saveCatalogSession({ scrollY: window.scrollY });
      recordNavigationOrigin('/products', 'Products Catalog');
    }
    router.push(`/product/${product.id}`);
  };

  const activeParentCategoryObj = useMemo(() => {
    return parentCategories.find((p) => p.id === selectedParentCategory);
  }, [parentCategories, selectedParentCategory]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* 1. Page Header with Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/" className="hover:text-teal-700 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-teal-900 font-bold">Products Catalog</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Authentic Amway Products
          </h1>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Direct factory-sealed inventory • 100% genuine
        </div>
      </div>

      {/* 2. Search Bar at the Top (with Live Autocomplete Dropdown) */}
      <div ref={searchContainerRef} className="relative z-30">
        <div className="relative flex items-center shadow-xs rounded-2xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            id="product-search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowDropdown(false);
            }}
            placeholder="Search by product name, category, or wellness goal (e.g. Protein, Daily, Calcium)..."
            className="w-full pl-11 pr-24 py-3 sm:py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-2xl text-base sm:text-sm font-medium shadow-sm border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowDropdown(false);
              }}
              className="absolute right-2.5 sm:right-3 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              Clear ✕
            </button>
          )}
        </div>

        {/* Live Autocomplete Dropdown */}
        {showDropdown && searchQuery.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100 z-50 animate-fade-in max-h-72 sm:max-h-80 overflow-y-auto touch-scroll">
            {suggestions.length > 0 ? (
              <>
                <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10">
                  <span>Matching Products</span>
                  <span>{suggestions.length} suggestions</span>
                </div>
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item)}
                    className="p-2.5 sm:p-3 sm:px-4 hover:bg-teal-50/70 transition-colors flex items-center justify-between gap-3 cursor-pointer group min-h-[52px]"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain"
                          onError={(e: any) => {
                            e.target.src = 'https://placehold.co/100x100/F0FDFA/0F766E?text=Amway';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 group-hover:text-teal-800 transition-colors truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-teal-700">{item.weight}</span>
                          <span>•</span>
                          <span className="truncate">
                            {item.parentCategory ? `${item.parentCategory} > ${item.category}` : item.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-teal-900">
                        ₹{item.price.toLocaleString('en-IN')}
                      </div>
                      {item.mrp > item.price && (
                        <div className="text-[10px] text-slate-400 line-through">
                          MRP ₹{item.mrp.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="p-5 text-center text-xs text-slate-500">
                No matching products found for &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Category & Department Filters */}
      <div id="categories" className="space-y-4">
        {/* Tier 1: Main Departments Bar with Arrow Marks & Scroll Indicators */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs relative">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Left Scroll Button */}
            <button
              type="button"
              onClick={() => handleScrollDept('left')}
              disabled={!canScrollDeptLeft}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                canScrollDeptLeft
                  ? 'bg-slate-100 hover:bg-teal-50 text-teal-800 border border-slate-200 shadow-2xs'
                  : 'text-slate-300 opacity-20 pointer-events-none'
              }`}
              title="Scroll categories left"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Departments Track */}
            <div
              ref={deptBarRef}
              onScroll={checkDeptScroll}
              className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto touch-scroll no-scrollbar scroll-smooth pb-0.5"
            >
              {/* All Products Tab */}
              <button
                onClick={() => {
                  setSelectedParentCategory('all');
                  setSelectedSubcategory('all');
                }}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  selectedParentCategory === 'all'
                    ? 'bg-teal-900 text-white shadow-sm ring-2 ring-teal-700/20'
                    : 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>All Departments</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    selectedParentCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {products.length}
                </span>
              </button>

              {/* Parent Categories */}
              {parentCategories.map((parent) => {
                const subs = subcategoriesMap[parent.id] || [];
                const subIds = new Set(subs.map((s) => s.id));
                const subNames = new Set(subs.map((s) => s.name.toLowerCase()));

                const count = products.filter(
                  (p) =>
                    p.parentCategoryId === parent.id ||
                    (p.parentCategory && p.parentCategory.toLowerCase() === parent.name.toLowerCase()) ||
                    p.categoryId === parent.id ||
                    subIds.has(p.categoryId) ||
                    (p.category && subNames.has(p.category.toLowerCase()))
                ).length;

                const isActive = selectedParentCategory === parent.id;

                return (
                  <button
                    key={parent.id}
                    onClick={() => {
                      setSelectedParentCategory(parent.id);
                      setSelectedSubcategory('all');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-teal-900 text-white shadow-sm ring-2 ring-teal-700/20'
                        : 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <CategoryIcon id={parent.id} name={parent.name} className="w-4 h-4 shrink-0" />
                    <span>{parent.name}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          isActive ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-800'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {count === 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-400 font-medium">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Button */}
            <button
              type="button"
              onClick={() => handleScrollDept('right')}
              disabled={!canScrollDeptRight}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                canScrollDeptRight
                  ? 'bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 shadow-2xs'
                  : 'text-slate-300 opacity-20 pointer-events-none'
              }`}
              title="Scroll categories right"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Scroll Indicator Pill */}
          {canScrollDeptRight && (
            <div className="md:hidden flex items-center justify-end px-2 pt-1 text-[10px] text-teal-800 font-bold gap-1 animate-pulse">
              <span>Scroll categories</span>
              <span>➔</span>
            </div>
          )}
        </div>

        {/* Tier 2: Subcategories Pills (Only rendered when a specific department is selected) */}
        {selectedParentCategory !== 'all' && activeSubcategories.length > 0 && (
          <div className="space-y-2 animate-fadeInOverlay">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-teal-700" />
                <span>
                  {activeParentCategoryObj?.name || 'Department'} Subcategories:
                </span>
              </span>
              {selectedSubcategory !== 'all' && (
                <button
                  onClick={() => setSelectedSubcategory('all')}
                  className="text-[11px] font-bold text-teal-800 hover:underline cursor-pointer"
                >
                  View All {activeParentCategoryObj?.name || ''} (Reset ✕)
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* All in department button */}
              <button
                onClick={() => setSelectedSubcategory('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedSubcategory === 'all'
                    ? 'bg-teal-800 text-white shadow-xs scale-102 ring-2 ring-teal-600/30'
                    : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200 hover:border-teal-300 shadow-2xs'
                }`}
              >
                <Tag className="w-3 h-3" />
                <span>All {activeParentCategoryObj?.name || ''}</span>
              </button>

              {/* Subcategory Pills */}
              {activeSubcategories.map((sub) => {
                const count = products.filter(
                  (p) =>
                    p.categoryId === sub.id ||
                    (p.category &&
                      (p.category.toLowerCase() === sub.name.toLowerCase() ||
                        p.category.toLowerCase().includes(sub.name.toLowerCase()) ||
                        sub.name.toLowerCase().includes(p.category.toLowerCase())))
                ).length;

                const isActive = selectedSubcategory === sub.id;

                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubcategory(sub.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-800 text-white shadow-xs scale-102 ring-2 ring-teal-600/30'
                        : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200 hover:border-teal-300 shadow-2xs'
                    }`}
                  >
                    <CategoryIcon id={sub.id} name={sub.name} className="w-3.5 h-3.5 shrink-0" />
                    <span>{sub.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Toolbar: Results Count & Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="text-xs font-semibold text-slate-700 flex items-center gap-2 flex-wrap">
          <span>
            Showing <strong className="text-teal-800 font-bold">{filteredProducts.length}</strong> Products
          </span>
          {selectedParentCategory !== 'all' && (
            <span className="text-xs bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200 font-bold flex items-center gap-1.5">
              <CategoryIcon id={activeParentCategoryObj?.id || ''} name={activeParentCategoryObj?.name} className="w-3.5 h-3.5 text-teal-800 shrink-0" />
              <span>{activeParentCategoryObj?.name}</span>
            </span>
          )}
          {selectedSubcategory !== 'all' && (
            <span className="text-xs bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
              Subcategory: {categories.find((c) => c.id === selectedSubcategory)?.name}
            </span>
          )}
          {searchQuery && (
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 font-bold">
              Filter: &ldquo;{searchQuery}&rdquo;
            </span>
          )}
          {(selectedParentCategory !== 'all' || selectedSubcategory !== 'all') && (
            <button
              onClick={() => {
                setSelectedParentCategory('all');
                setSelectedSubcategory('all');
              }}
              className="text-xs text-rose-600 hover:underline font-bold ml-1 cursor-pointer"
            >
              Reset all filters ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs font-bold text-slate-500 shrink-0">
            Sort by:
          </span>
          <div className="relative flex-1 sm:flex-initial min-w-[170px]" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-teal-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-teal-600 cursor-pointer min-h-[38px] transition-all"
              aria-haspopup="listbox"
              aria-expanded={isSortOpen}
            >
              <span>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Featured Catalog'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isSortOpen ? 'rotate-180 text-teal-700' : ''}`} />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-full min-w-[180px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-40 animate-fadeInOverlay">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value);
                        setIsSortOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 text-teal-900 font-black'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Modern Product Grid OR Department Coming Soon Card */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => {
            const stockInfo = stockMap[product.sku || product.id];
            const stockStatus = stockInfo?.status || 'IN_STOCK';
            return (
              <ProductCard
                key={product.id}
                product={product}
                stockStatus={stockStatus}
              />
            );
          })}
        </div>
      ) : selectedParentCategory !== 'all' && selectedParentCategory !== 'nutritional' && !searchQuery ? (
        /* Empty Department Branded Coming Soon Showcase */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm text-center max-w-2xl mx-auto space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center mx-auto shadow-2xs">
            <CategoryIcon id={activeParentCategoryObj?.id || ''} name={activeParentCategoryObj?.name} className="w-8 h-8 text-teal-800" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
              {activeParentCategoryObj?.name} Collection Launching Soon
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {activeParentCategoryObj?.description ||
                'We are curating authentic factory-sealed items for this department to deliver with direct regional fulfillment.'}
            </p>
          </div>

          <div className="pt-3">
            <button
              onClick={() => {
                setSelectedParentCategory('nutritional');
                setSelectedSubcategory('all');
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Explore Nutritional Wellness Catalog</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <Search className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No products match your search</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn't find any products matching &ldquo;{searchQuery}&rdquo; in this category.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedParentCategory('all');
              setSelectedSubcategory('all');
            }}
            className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold hover:bg-teal-900 transition-colors cursor-pointer"
          >
            Clear Filters &amp; View All Products
          </button>
        </div>
      )}
    </div>
  );
}

