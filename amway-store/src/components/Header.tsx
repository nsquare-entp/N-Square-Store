'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Package, MessageSquare, User, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';

export default function Header() {
  const pathname = usePathname();
  const openSidebar = useCartStore((state) => state.openSidebar);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLinkActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Do not render the consumer store header on admin consoles or full-screen gallery
  if (pathname?.startsWith('/admin') || pathname?.includes('/gallery')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
        {/* Brand & Partner Identification */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group text-decoration-none min-w-0">
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
              <img
                src="/images/logo.png"
                alt="N-Square Store Logo"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-base sm:text-lg md:text-xl tracking-tight text-slate-950 truncate">
                N-Square <span className="text-teal-700">Store</span>
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-tight truncate">
                Amway Direct selling
              </span>
            </div>
          </Link>
        </div>

        {/* Center Navigation Links (Themed, Icons + Consistent Text Sizing) */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          <Link
            href="/"
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              isLinkActive('/')
                ? 'bg-teal-50 text-teal-900 font-bold shadow-2xs border border-teal-200/60'
                : 'text-slate-600 hover:text-teal-800 hover:bg-slate-100/80'
            }`}
          >
            <Home className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Home</span>
          </Link>

          <Link
            href="/products"
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              isLinkActive('/products')
                ? 'bg-teal-50 text-teal-900 font-bold shadow-2xs border border-teal-200/60'
                : 'text-slate-600 hover:text-teal-800 hover:bg-slate-100/80'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-teal-700 shrink-0" />
            <span>All Products</span>
          </Link>

          {/* My Orders (Only visible to authenticated customers) */}
          {mounted && isAuthenticated && user && (
            <Link
              href="/profile?tab=orders"
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                pathname === '/profile'
                  ? 'bg-teal-50 text-teal-900 font-bold shadow-2xs border border-teal-200/60'
                  : 'text-slate-600 hover:text-teal-800 hover:bg-slate-100/80'
              }`}
            >
              <Package className="w-4 h-4 text-teal-700 shrink-0" />
              <span>My Orders</span>
            </Link>
          )}

          {/* Contact & Consultation */}
          <Link
            href="/contact"
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              isLinkActive('/contact')
                ? 'bg-teal-50 text-teal-900 font-bold shadow-2xs border border-teal-200/60'
                : 'text-slate-600 hover:text-teal-800 hover:bg-slate-100/80'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Contact</span>
          </Link>
        </nav>

        {/* Right Actions: Account Link & Cart Trigger */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* User Account / Sign In Link */}
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl border border-slate-200/90 hover:border-teal-600 hover:bg-teal-50/50 transition-all text-slate-700"
            title={mounted && isAuthenticated && user ? `Signed in as ${user.name}` : 'Customer Login'}
          >
            {mounted && isAuthenticated && user ? (
              <>
                <span className="w-5 h-5 rounded-full bg-teal-800 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline max-w-[90px] truncate text-slate-900 font-bold text-xs sm:text-sm">
                  {user.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="hidden sm:inline text-xs sm:text-sm text-slate-700 font-semibold">Login</span>
              </>
            )}
          </Link>

          {/* Cart Button */}
          <button
            onClick={openSidebar}
            id="open-cart-drawer-btn"
            className="relative flex items-center gap-2 bg-gradient-to-r from-teal-800 to-emerald-700 hover:from-teal-900 hover:to-emerald-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer text-xs sm:text-sm shrink-0"
            aria-label="Open Shopping Cart"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black rounded-full h-4 sm:h-5 min-w-[16px] sm:min-w-[20px] px-1 flex items-center justify-center border-2 border-white shadow-2xs animate-pulse">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">Cart</span>
            {mounted && totalPrice > 0 && (
              <span className="hidden sm:inline text-xs font-black bg-white/20 px-2 py-0.5 rounded-lg">
                ₹{totalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
