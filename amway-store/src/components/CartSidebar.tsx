'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ShoppingBag, MessageSquare } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import confetti from 'canvas-confetti';
import { generateWhatsAppLink } from '../utils/whatsapp';
import { SOCIAL_LINKS } from '../config/social';

export default function CartSidebar() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const isSidebarOpen = useCartStore((state) => state.isSidebarOpen);
  const closeSidebar = useCartStore((state) => state.closeSidebar);
  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        closeSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, closeSidebar]);

  // Lock background scrolling when orders sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isSidebarOpen]);

  if (!isSidebarOpen) return null;

  const handleCheckout = () => {
    if (items.length === 0) return;

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#0F766E', '#10B981', '#F59E0B', '#3B82F6'],
      });
    } catch (e) {
      // safe fallback
    }

    const resolvedName = user?.name || '';
    const resolvedPhone = user?.mobile || '';
    const resolvedCity = user?.address?.city || '';

    // Format WhatsApp message
    const orderItemsSummary = items.map(
      (item, idx) => `${idx + 1}. *${item.name}${item.variant ? ` (${item.variant})` : ''}* (x${item.qty}) - ₹${(item.price * item.qty).toLocaleString('en-IN')}`
    ).join('\n');

    let msg = `*NEW ORDER - N-SQUARE STORE*\n`;
    msg += `--------------------------------------\n`;
    if (resolvedName) msg += `👤 *Customer:* ${resolvedName}\n`;
    if (resolvedPhone) msg += `📱 *Phone:* ${resolvedPhone}\n`;
    if (resolvedCity) msg += `📍 *Delivery City:* ${resolvedCity}\n`;
    msg += `--------------------------------------\n`;
    msg += `🛒 *Items Ordered:*\n${orderItemsSummary}\n`;
    msg += `--------------------------------------\n`;
    msg += `💰 *Total Amount:* ₹${totalPrice.toLocaleString('en-IN')}\n`;
    msg += `--------------------------------------\n`;
    msg += `Please confirm my order and share estimated dispatch date. Thank you!`;

    // Record lead in background so admin sees WhatsApp cart checkouts
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: resolvedName || 'WhatsApp Customer',
        mobile: resolvedPhone || 'Direct WhatsApp',
        cartItems: items.map((it) => ({
          name: it.name,
          qty: it.qty,
          price: it.price,
          variant: it.variant,
        })),
        topic: `Cart Drawer Order (${resolvedCity || 'Direct Inquiry'})`,
      }),
    }).catch((e) => console.log('Lead record notice:', e));

    const encoded = encodeURIComponent(msg);
    const targetNumber = SOCIAL_LINKS.whatsappNumber || '919876543210'; 
    const url = `https://wa.me/${targetNumber}?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden flex justify-end"
      style={{ touchAction: 'none' }}
    >
      {/* Backdrop with touch and wheel interception */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fadeInOverlay"
        onClick={closeSidebar}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div 
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-drawerSlideIn overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-900 to-emerald-900 text-white">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-teal-200 shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">Your Nutrition Cart</h2>
              <p className="text-xs text-teal-200">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} selected
              </p>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Items Container with isolated scroll */}
        <div 
          className="flex-1 overflow-y-auto touch-scroll overscroll-contain p-4 space-y-3"
          style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
        >
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                <ShoppingBag className="w-8 h-8 text-teal-700" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Your cart is empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-6 leading-relaxed">
                Explore our authentic Amway wellness, nutrition, beauty, and home essentials to support your health.
              </p>
              <button
                onClick={closeSidebar}
                className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-full shadow-sm transition-all cursor-pointer"
              >
                Browse Products
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-teal-200 bg-white hover:bg-teal-50/20 transition-all shadow-xs"
              >
                {/* Image */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-contain rounded-lg border border-slate-100 bg-slate-50/50 p-1 flex-shrink-0"
                  onError={(e: any) => {
                    e.target.src = 'https://placehold.co/100x100/F0FDFA/0F766E?text=Amway';
                  }}
                />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                    {item.name}
                  </h4>
                  {item.variant && (
                    <span className="text-[10px] text-slate-500 block">
                      {item.variant}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-extrabold text-teal-800">
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-[10px] text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout Section with Safe Area Clearance */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
            {/* Price Summary */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1">
                <span>Total Payable:</span>
                <span className="text-teal-800">₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Main Action Buttons */}
            <button
              onClick={() => {
                closeSidebar();
                router.push('/cart');
              }}
              id="sidebar-review-cart-btn"
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>{isAuthenticated ? '✓ Review & Submit Order Request →' : 'Review Cart & Checkout →'}</span>
            </button>

            {!isAuthenticated && (
              <button
                onClick={handleCheckout}
                id="whatsapp-checkout-btn"
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>First Time? Order via WhatsApp</span>
              </button>
            )}

            <button
              onClick={clearCart}
              className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
