'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Tag, Truck, MessageSquare } from 'lucide-react';
import { SOCIAL_LINKS, getWhatsAppContactUrl } from '../config/social';

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
                alt="N-Square Official Logo"
                className="w-full h-full object-contain filter drop-shadow-2xs"
              />
            </div>
            <div>
              <span className="font-black text-slate-900 text-sm sm:text-base leading-tight block">
                N-Square <span className="text-teal-700">Official</span>
              </span>
              <span className="text-[10px] text-teal-700 font-semibold block">
                Authorized Amway Direct Selling Partner
              </span>
            </div>
          </Link>

          {/* Simple, Attractive Trust Badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center text-[10px] sm:text-[11px] font-semibold text-slate-600">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50/80 border border-teal-200/60 text-teal-900">
              <ShieldCheck className="w-3 h-3 text-teal-700 shrink-0" />
              <span>100% Genuine Amway</span>
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

        {/* Middle: Navigation Links & Official Social Channels */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap justify-center font-medium">
            <Link href="/" className="hover:text-teal-700 transition-colors">Home</Link>
            <span className="text-slate-300">•</span>
            <Link href="/products" className="hover:text-teal-700 transition-colors">All Products</Link>
            <span className="text-slate-300">•</span>
            <Link href="/profile?tab=orders" className="hover:text-teal-700 transition-colors">My Orders</Link>
            <span className="text-slate-300">•</span>
            <Link href="/contact" className="hover:text-teal-700 transition-colors">Contact Us</Link>
          </div>

          {/* Official Channels Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* WhatsApp */}
            <a
              href={getWhatsAppContactUrl('Hello N-Square Official, I would like to inquire about Amway products.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-all"
              title="Connect on WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
              <span>WhatsApp</span>
            </a>

            {/* YouTube */}
            <a
              href={SOCIAL_LINKS.youtubeUrl || 'https://www.youtube.com/@N_Square_Official'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold transition-all"
              title="Watch on YouTube"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span>YouTube</span>
            </a>

            {/* Instagram */}
            <a
              href={SOCIAL_LINKS.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold transition-all"
              title="Follow on Instagram"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
              <span>Instagram</span>
            </a>

            {/* LinkedIn */}
            <a
              href={SOCIAL_LINKS.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0077b5] border border-blue-200 text-[11px] font-bold transition-all"
              title="Connect on LinkedIn"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 1 0 1.6 1.6 1.6 1.6 0 0 0-1.6-1.6Z"/>
              </svg>
              <span>LinkedIn</span>
            </a>
          </div>
        </div>

        {/* Bottom: Minimal One-Line Copyright */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-400 text-center sm:text-left pr-12 sm:pr-0">
          <p>© {new Date().getFullYear()} N-Square Official. Authentic Amway Direct Selling Partner.</p>
          <p className="text-[9.5px] text-slate-400">All products dispatched directly from Amway India regional fulfillment centers.</p>
        </div>
      </div>
    </footer>
  );
}
