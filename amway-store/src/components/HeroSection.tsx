'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Tag, Truck, MessageSquare, ArrowRight } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-tr from-slate-950 via-teal-950 to-emerald-950 text-white p-5 sm:p-8 md:p-12 lg:p-14 shadow-xl border border-teal-800/40 select-none">
      {/* Background Ambient Radial Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.12),transparent_50%)] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center space-y-4 sm:space-y-6">
        {/* Top Tagline Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-200 text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-400 animate-ping"></span>
          <span>N-Square Store • Amway Direct selling</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-2xl min-[480px]:text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          <span className="block sm:inline">Authentic Amway Products,</span>{' '}
          <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-amber-200 bg-clip-text text-transparent sm:whitespace-nowrap">
            Delivered Directly to You.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl font-normal leading-relaxed">
          Discover genuine Amway nutrition, wellness, personal care, beauty, and home living essentials. Enjoy 100% genuine factory sealed products with direct member savings and door-to-door delivery across India.
        </p>

        {/* Explore Products Action Button */}
        <div className="pt-2 sm:pt-3">
          <Link
            href="/products"
            className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm md:text-base shadow-xl hover:shadow-teal-500/30 hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer"
          >
            <span>Explore Products</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 4 Customer Value Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3.5 w-full max-w-3xl pt-1 sm:pt-2">
          <div className="bg-white/10 backdrop-blur-md p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/15 text-center flex flex-col items-center transition-all hover:bg-white/15">
            <div className="w-8 h-8 rounded-full bg-teal-400/20 flex items-center justify-center text-teal-300 mb-1.5">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="font-bold text-white text-[11px] sm:text-xs">100% Genuine</div>
            <div className="text-[10px] sm:text-[11px] text-teal-200 mt-0.5">Sealed Factory Units</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/15 text-center flex flex-col items-center transition-all hover:bg-white/15">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 mb-1.5">
              <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="font-bold text-white text-[11px] sm:text-xs">Direct Selling Discount</div>
            <div className="text-[10px] sm:text-[11px] text-amber-200 mt-0.5">Direct Savings on MRP</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/15 text-center flex flex-col items-center transition-all hover:bg-white/15">
            <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-300 mb-1.5">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="font-bold text-white text-[11px] sm:text-xs">Pan-India Delivery</div>
            <div className="text-[10px] sm:text-[11px] text-emerald-200 mt-0.5">Direct Hub Dispatch</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/15 text-center flex flex-col items-center transition-all hover:bg-white/15">
            <div className="w-8 h-8 rounded-full bg-teal-400/20 flex items-center justify-center text-teal-300 mb-1.5">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="font-bold text-white text-[11px] sm:text-xs">Expert Guidance</div>
            <div className="text-[10px] sm:text-[11px] text-teal-200 mt-0.5">Direct WhatsApp Support</div>
          </div>
        </div>
      </div>
    </section>
  );
}
