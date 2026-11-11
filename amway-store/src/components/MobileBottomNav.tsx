'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, ShoppingCart, User, MessageSquare, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());
  const lastAddedItem = useCartStore((state) => state.lastAddedItem);
  const [mounted, setMounted] = useState(false);
  const [showFloatingToast, setShowFloatingToast] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show floating cart animation when an item is added
  useEffect(() => {
    if (lastAddedItem && Date.now() - lastAddedItem.timestamp < 4000 && pathname !== '/cart') {
      setShowFloatingToast(true);
      const timer = setTimeout(() => {
        setShowFloatingToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedItem, pathname]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Do not render the consumer store bottom bar in admin consoles or full-screen gallery
  if (pathname?.startsWith('/admin') || pathname?.includes('/gallery')) {
    return null;
  }

  return (
    <>
      {/* Floating Animated Pill Right Above Bottom Nav when Item Added */}
      {showFloatingToast && lastAddedItem && (
        <div className="fixed bottom-16 left-3 right-3 z-50 md:hidden animate-bounce-subtle pointer-events-auto">
          <Link
            href="/cart"
            onClick={() => setShowFloatingToast(false)}
            className="flex items-center justify-between gap-3 bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-teal-500/40 backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-teal-200 truncate">
                  {lastAddedItem.name} added!
                </div>
                <div className="text-[11px] text-slate-300">
                  {totalItems} item{totalItems > 1 ? 's' : ''} in cart • ₹{totalPrice.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-2.5 py-1.5 rounded-xl shadow-xs shrink-0 transition-transform active:scale-95">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      )}

      <nav
        aria-label="Mobile Navigation Bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl pb-[env(safe-area-inset-bottom,8px)] pt-1.5 transition-all"
      >
        <div className="grid grid-cols-5 items-center justify-around px-1 text-center">
          {/* 1. Home */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${isActive('/') ? 'text-teal-900 font-extrabold' : 'text-slate-500 hover:text-teal-700'
              }`}
          >
            <div className="relative">
              <Home className={`w-5 h-5 ${isActive('/') ? 'text-teal-800 scale-110' : 'text-slate-500'} transition-transform`} />
            </div>
            <span className="text-xs tracking-tight mt-1 font-semibold">Home</span>
          </Link>

          {/* 2. Products */}
          <Link
            href="/products"
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${isActive('/products') ? 'text-teal-900 font-extrabold' : 'text-slate-500 hover:text-teal-700'
              }`}
          >
            <div className="relative">
              <ShoppingBag className={`w-5 h-5 ${isActive('/products') ? 'text-teal-800 scale-110' : 'text-slate-500'} transition-transform`} />
            </div>
            <span className="text-xs tracking-tight mt-1 font-semibold">Products</span>
          </Link>

          {/* 3. Shopping Cart Direct Link (Billing Page) */}
          <Link
            href="/cart"
            id="mobile-bottom-cart-btn"
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${isActive('/cart') ? 'text-teal-900 font-extrabold' : 'text-slate-500 hover:text-teal-700'
              }`}
            aria-label="View Cart and Billing"
          >
            <div className="relative">
              <ShoppingCart className={`w-5 h-5 ${isActive('/cart') ? 'text-teal-800 scale-110' : 'text-slate-500'} transition-transform`} />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white shadow-2xs animate-pulse">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-xs tracking-tight mt-1 font-semibold">Cart</span>
          </Link>

          {/* 4. Customer Account */}
          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${isActive('/profile') ? 'text-teal-900 font-extrabold' : 'text-slate-500 hover:text-teal-700'
              }`}
          >
            <div className="relative">
              <User className={`w-5 h-5 ${isActive('/profile') ? 'text-teal-800 scale-110' : 'text-slate-500'} transition-transform`} />
            </div>
            <span className="text-xs tracking-tight mt-1 font-semibold">Account</span>
          </Link>

          {/* 5. Contact */}
          <Link
            href="/contact"
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${isActive('/contact') ? 'text-teal-900 font-extrabold' : 'text-slate-500 hover:text-teal-700'
              }`}
          >
            <div className="relative">
              <MessageSquare className={`w-5 h-5 ${isActive('/contact') ? 'text-teal-800 scale-110' : 'text-slate-500'} transition-transform`} />
            </div>
            <span className="text-xs tracking-tight mt-1 font-semibold">Contact</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
