'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Tag, Truck } from 'lucide-react';
import { getWhatsAppContactUrl } from '../config/social';

export default function Footer() {
  const pathname = usePathname();

  // Do not render the consumer store footer in admin consoles or full-screen gallery
  if (pathname?.startsWith('/admin') || pathname?.includes('/gallery')) {
    return null;
  }

  return (
    <footer className="bg-white text-slate-600 pt-7 sm:pt-9 pb-24 sm:pb-9 border-t border-slate-200/90 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* Top: Brand & Clean Trust Pills */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <img
                src="/images/logo.png"
                alt="N-Square Store Logo"
                className="w-full h-full object-contain filter drop-shadow-2xs"
              />
            </div>
            <div>
              <span className="font-black text-slate-900 text-sm sm:text-base leading-tight block">
                N-Square <span className="text-teal-700">Store</span>
              </span>
              <span className="text-[10px] text-teal-700 font-semibold block">
                Amway Direct Selling Partner
              </span>
            </div>
          </Link>

          {/* Simple, Attractive Trust Badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center text-[10px] sm:text-[11px] font-semibold text-slate-600">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50/80 border border-teal-200/60 text-teal-900">
              <ShieldCheck className="w-3 h-3 text-teal-700 shrink-0" />
              <span>100% Genuine</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/60 text-emerald-900">
              <Tag className="w-3 h-3 text-emerald-700 shrink-0" />
              <span>Direct Discounts</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
              <Truck className="w-3 h-3 text-slate-600 shrink-0" />
              <span>Pan-India Delivery</span>
            </div>
          </div>
        </div>

        {/* Middle: Clean Navigation & WhatsApp Guidance */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap justify-center font-medium">
            <Link href="/" className="hover:text-teal-700 transition-colors">Home</Link>
            <span className="text-slate-300">•</span>
            <Link href="/products" className="hover:text-teal-700 transition-colors">All Products</Link>
            <span className="text-slate-300">•</span>
            <Link href="/profile?tab=orders" className="hover:text-teal-700 transition-colors">My Orders</Link>
            <span className="text-slate-300">•</span>
            <Link href="/contact" className="hover:text-teal-700 transition-colors">Contact</Link>
          </div>

          <div className="text-[11px] text-slate-500 text-center sm:text-right pr-12 sm:pr-0">
            Need guidance?{' '}
            <a
              href={getWhatsAppContactUrl('Hello N-Square Store, I would like to inquire about Amway products.')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 font-bold hover:underline"
            >
              WhatsApp Consultant
            </a>
          </div>
        </div>

        {/* Bottom: Minimal One-Line Copyright */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-400 text-center sm:text-left pr-12 sm:pr-0">
          <p>© {new Date().getFullYear()} N-Square Store. Authentic Amway Direct Selling.</p>
          <p className="text-[9.5px] text-slate-400">Dispatched directly from Amway India regional distribution hubs.</p>
        </div>
      </div>
    </footer>
  );
}

