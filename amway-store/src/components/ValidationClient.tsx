'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  Microscope,
  Search,
  Dumbbell,
  Scale,
  Pill,
  Heart,
  Leaf,
  Activity,
  FileCheck,
  Target,
} from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import AdminPinLock from './admin/AdminPinLock';

export interface VerificationRow {
  ingredient: string;
  product_measurement: string;
  standard_measurement: string;
  fit_assessment: string;
  rating: 'Good' | 'Moderate' | 'Bad';
}

export interface ProductReport {
  id: string;
  sku?: string;
  name: string;
  price?: string | number;
  image?: string;
  image_url?: string;
  usp?: string;
  clinical_nutrition_rationale?: {
    what_it_is: string;
    why_it_is_needed: string;
  };
  medical_standards_validation: {
    standard_authority: string;
    standard_url: string;
    secondary_url?: string;
    verification_table: VerificationRow[];
  };
  who_may_use?: string[];
  who_should_not_use?: string[];
}

export interface CategoryData {
  category_id?: string;
  category_name?: string;
  category_description?: string;
  scenario?: string;
  verdict?: string;
  total_products?: number;
  products: ProductReport[];
}

interface ValidationClientProps {
  categories: Record<string, CategoryData>;
}

export default function ValidationClient({ categories }: ValidationClientProps) {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('category1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const addItem = useCartStore((state) => state.addItem);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('nsquare_admin_token') : null;
    if (token) {
      fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.valid) {
            setIsAdminUnlocked(true);
          } else {
            sessionStorage.removeItem('nsquare_admin_token');
            setIsAdminUnlocked(false);
          }
        })
        .catch(() => setIsAdminUnlocked(false))
        .finally(() => setCheckingAuth(false));
    } else {
      setIsAdminUnlocked(false);
      setCheckingAuth(false);
    }
  }, []);

  const currentCategory = categories[activeTab] || categories['category1'];
  const products = currentCategory?.products || [];

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const skuMatch = (p.sku || p.id || '').toLowerCase().includes(q);
      const ingredientMatch = p.medical_standards_validation?.verification_table?.some((r) =>
        r.ingredient.toLowerCase().includes(q)
      );
      const whatMatch = p.clinical_nutrition_rationale?.what_it_is.toLowerCase().includes(q);
      const whyMatch = p.clinical_nutrition_rationale?.why_it_is_needed.toLowerCase().includes(q);
      return nameMatch || skuMatch || ingredientMatch || whatMatch || whyMatch;
    });
  }, [products, searchQuery]);

  const handleQuickAdd = (product: ProductReport) => {
    let numericPrice = 0;
    if (typeof product.price === 'number') {
      numericPrice = product.price;
    } else if (typeof product.price === 'string') {
      const match = product.price.match(/(?:ABO|Direct\s*Selling)\s*Price:\s*₹?([\d,.]+)/i);
      numericPrice = match ? parseFloat(match[1].replace(/,/g, '')) : 0;
    }

    addItem({
      id: product.id,
      sku: product.sku || product.id,
      name: product.name,
      price: numericPrice || 999,
      mrp: numericPrice ? Math.round(numericPrice * 1.15) : 1150,
      image: product.image || product.image_url || `/images/products/${product.id}.png`,
    });

    setToastMsg(`Added "${product.name}" to inquiry cart`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const tabs = [
    { key: 'category1', label: 'Protein Powders', icon: <Dumbbell className="w-3.5 h-3.5 shrink-0" />, count: categories['category1']?.products.length || 4 },
    { key: 'category2', label: 'Weight Management', icon: <Scale className="w-3.5 h-3.5 shrink-0" />, count: categories['category2']?.products.length || 4 },
    { key: 'category3', label: 'Tablets & Capsules', icon: <Pill className="w-3.5 h-3.5 shrink-0" />, count: categories['category3']?.products.length || 24 },
    { key: 'category4', label: 'Gummies', icon: <Heart className="w-3.5 h-3.5 shrink-0" />, count: categories['category4']?.products.length || 4 },
    { key: 'category5', label: 'Traditional Herbs', icon: <Leaf className="w-3.5 h-3.5 shrink-0" />, count: categories['category5']?.products.length || 8 },
    { key: 'scenario1', label: 'Scenario: Lean Muscle', icon: <Activity className="w-3.5 h-3.5 shrink-0" />, count: categories['scenario1']?.products.length || 4 },
    { key: 'scenario2', label: 'Scenario: Postpartum', icon: <FileCheck className="w-3.5 h-3.5 shrink-0" />, count: categories['scenario2']?.products.length || 4 },
  ];

  if (checkingAuth) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Verifying Administrator Credentials...</p>
      </div>
    );
  }

  if (!isAdminUnlocked) {
    return (
      <div className="py-6 sm:py-10 max-w-xl mx-auto space-y-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-center text-xs space-y-1">
          <p className="font-extrabold text-sm flex items-center justify-center gap-1.5">
            <Lock className="w-4 h-4 text-amber-800" />
            <span>Admin-Restricted Portal</span>
          </p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            The ICMR-NIN 2020 RDA Medical Standards Validation Studio is confidential and accessible only to authorized N-Square Store administrators. Please enter your 4-digit admin security PIN to unlock this studio.
          </p>
        </div>
        <AdminPinLock onUnlock={() => setIsAdminUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-teal-600 text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 bg-white px-3.5 py-1.5 rounded-full border border-teal-200 shadow-2xs cursor-pointer"
          >
            <span>←</span>
            <span>Back to Admin Operations Hub</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/15 border border-teal-400/30 text-teal-900">
            <Microscope className="w-3.5 h-3.5 text-teal-800" />
            <span>Evidence-Based Medical Verification (Admin Only)</span>
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
          Product Verification &amp; Validation Report
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed">
          Comprehensive scientific cross-referencing across all 44 Amway Nutrilite™ formulations. Each formulation is benchmarked against <strong className="text-teal-900">ICMR-NIN 2020 RDA</strong>, WHO/FAO clinical guidelines, and NIH dietary monographs with full Clinical Nutritionist rationales.
        </p>
      </div>

      {/* Category & Scenario Tabs */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-teal-800 text-white shadow-md ring-2 ring-teal-600/30 scale-102'
                  : 'bg-white text-slate-700 hover:bg-teal-50/80 border border-slate-200/90 shadow-2xs'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-teal-950 text-teal-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scenario Context Card (if Scenario tab is active) */}
      {currentCategory.scenario && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white shadow-lg border border-teal-700/40 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/20 text-teal-200 text-xs font-bold uppercase tracking-wider">
            <Target className="w-3.5 h-3.5 text-teal-300" />
            <span>Clinical Case Protocol Directive</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            {currentCategory.scenario}
          </h3>
          {currentCategory.verdict && (
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs text-slate-200 leading-relaxed">
              <strong className="text-teal-300 font-bold">Medical Strategic Verdict: </strong>
              {currentCategory.verdict}
            </div>
          )}
        </div>
      )}

      {/* Search Bar & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ingredient, formulation, or SKU..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
          <strong className="text-slate-900">{products.length}</strong> formulations in this category
        </div>
      </div>

      {/* Product Clinical Verification Cards */}
      <div className="space-y-8">
        {filteredProducts.map((p) => {
          const vTable = p.medical_standards_validation?.verification_table || [];
          const authority = p.medical_standards_validation?.standard_authority || 'ICMR-NIN 2020 RDA Standard';
          const authUrl = p.medical_standards_validation?.standard_url;
          const rationale = p.clinical_nutrition_rationale;

          return (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow overflow-hidden p-6 sm:p-8 space-y-6"
            >
              {/* Product Header Row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0">
                    <img
                      src={p.image || p.image_url || `/images/products/${p.id}.png`}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e: any) => {
                        e.target.src = 'https://placehold.co/200x200/F0FDFA/0F766E?text=Nutrilite';
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                        SKU: {p.sku || p.id}
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                        ✓ Optimal Fit
                      </span>
                    </div>
                    <Link
                      href={`/product/${p.id}`}
                      className="text-base sm:text-lg font-black text-slate-900 hover:text-teal-700 transition-colors"
                    >
                      {p.name}
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <Link
                    href={`/product/${p.id}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-200"
                  >
                    Product Detail
                  </Link>
                  <button
                    onClick={() => handleQuickAdd(p)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <span>+ Quick Add</span>
                  </button>
                </div>
              </div>

              {/* Clinical Nutritionist Rationale ("What & Why") */}
              {rationale && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                    <div className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <span>🧬</span>
                      <span>Biochemical Matrix ("What it is")</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      {rationale.what_it_is}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-1.5">
                    <div className="text-xs font-black uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                      <span>🎯</span>
                      <span>Physiological Role ("Why it is needed")</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      {rationale.why_it_is_needed}
                    </p>
                  </div>
                </div>
              )}

              {/* Medical Standards Verification Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    Authority Benchmark:{' '}
                    <span className="text-teal-900 font-bold">{authority}</span>
                  </span>
                  {authUrl && (
                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 underline font-semibold hover:text-teal-900"
                    >
                      Monograph Reference ↗
                    </a>
                  )}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Ingredient</th>
                        <th className="p-3">Nutrilite Level</th>
                        <th className="p-3">Standard Measurement</th>
                        <th className="p-3">Clinical Fit Assessment</th>
                        <th className="p-3">Fit Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vTable.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-3 font-bold text-slate-900">{row.ingredient}</td>
                          <td className="p-3 font-semibold text-teal-900">{row.product_measurement}</td>
                          <td className="p-3 text-slate-600">{row.standard_measurement}</td>
                          <td className="p-3 text-slate-600 max-w-sm">{row.fit_assessment}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.rating === 'Good'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {row.rating === 'Good' ? 'Optimal Fit' : 'Targeted'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Target Demographics */}
              {((p.who_may_use && p.who_may_use.length > 0) || (p.who_should_not_use && p.who_should_not_use.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {p.who_may_use && p.who_may_use.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs text-slate-700 space-y-1">
                      <div className="font-bold text-emerald-950 flex items-center gap-1">
                        <span>✓</span>
                        <span>Recommended Candidates:</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {p.who_may_use.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {p.who_should_not_use && p.who_should_not_use.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs text-slate-700 space-y-1">
                      <div className="font-bold text-amber-950 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Contraindications:</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {p.who_should_not_use.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
