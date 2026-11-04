'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, ShoppingCart, User, MessageSquare } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const openSidebar = useCartStore((state) => state.openSidebar);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Do not render the consumer store bottom bar in admin consoles or full-screen gallery
  if (pathname?.startsWith('/admin') || pathname?.includes('/gallery')) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl pb-[env(safe-area-inset-bottom,8px)] pt-1.5 transition-all"
    >
      <div className="grid grid-cols-5 items-center justify-around px-1 text-center">
        {/* 1. Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            isActive('/') ? 'text-teal-900 font-extrabold' : 'text-slate-500 hover:text-teal-700'
          }`}
        >
          <div className="relative">
            <Home className={`w-5 h-5 ${isActive('/') ? 'text-teal-800 scale-110' : 'text-slate-500'} transition-transform`} />
          </div>
          <span className="text-[10px] tracking-tight mt-1 font-semibold">Home</span>
        </Link>

        {/* 2. Products */}
        <Link
          href="/products"
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            isActive('/products') ? 'text-teal-900 font-extrabold' : 'text-slate-500 hover:text-teal-700'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 ${isActive('/products') ? 'text-teal-800 scale-110' : 'text-slate-500'} transition-transform`} />
          </div>
          <span className="text-[10px] tracking-tight mt-1 font-semibold">Products</span>
        </Link>

        {/* 3. Shopping Cart Drawer Trigger */}
        <button
          onClick={openSidebar}
          id="mobile-bottom-cart-btn"
          className="relative flex flex-col items-center justify-center py-1.5 text-slate-500 hover:text-teal-700 rounded-xl transition-all cursor-pointer"
          aria-label="Open Cart"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full h-3.5 min-w-[14px] px-0.5 flex items-center justify-center border border-white shadow-2xs animate-pulse">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 font-semibold">Cart</span>
        </button>

        {/* 4. Customer Account */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            isActive('/profile') ? 'text-teal-900 font-extrabold' : 'text-slate-500 hover:text-teal-700'
          }`}
        >
          <div className="relative">
            <User className={`w-5 h-5 ${isActive('/profile') ? 'text-teal-800 scale-110' : 'text-slate-500'} transition-transform`} />
          </div>
          <span className="text-[10px] tracking-tight mt-1 font-semibold">Account</span>
        </Link>

        {/* 5. Contact */}
        <Link
          href="/contact"
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
            isActive('/contact') ? 'text-teal-900 font-extrabold' : 'text-slate-500 hover:text-teal-700'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 ${isActive('/contact') ? 'text-teal-800 scale-110' : 'text-slate-500'} transition-transform`} />
          </div>
          <span className="text-[10px] tracking-tight mt-1 font-semibold">Contact</span>
        </Link>
      </div>
    </nav>
  );
}
