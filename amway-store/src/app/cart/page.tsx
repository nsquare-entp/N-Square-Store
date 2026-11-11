'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, MessageSquare, MapPin, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SOCIAL_LINKS, getWhatsAppFirstOrderUrl, getWhatsAppContactUrl } from '../../config/social';
import { recordNavigationOrigin } from '../../utils/sessionManager';

export const dynamic = 'force-dynamic';

export default function CartPage() {
  const router = useRouter();
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const cartTotal = useCartStore((state) => state.getTotalPrice());

  const { user, isAuthenticated } = useAuthStore();

  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Guest WhatsApp checkout modal state (for first-time users)
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');

  // Prefill shipping address when authenticated user is loaded
  useEffect(() => {
    if (user?.address) {
      const parts = [
        user.address.street,
        user.address.city,
        user.address.state,
        user.address.pincode,
      ].filter(Boolean);
      if (parts.length > 0) {
        setShippingAddress(parts.join(', '));
      }
    }
  }, [user]);

  const handleDecrease = (item: any) => {
    updateQty(item.id, item.qty - 1);
  };

  const handleIncrease = (item: any) => {
    updateQty(item.id, item.qty + 1);
  };

  // -------------------------------------------------------------
  // AUTHENTICATED CUSTOMER: DIRECT IN-APP ORDER REQUEST
  // -------------------------------------------------------------
  const handleSubmitDirectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      router.push('/profile');
      return;
    }

    if (!shippingAddress.trim()) {
      alert('Please enter your shipping delivery address.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        userId: user.id,
        userName: user.name,
        userMobile: user.mobile,
        userEmail: user.email || '',
        shippingAddress: shippingAddress.trim(),
        items: cartItems.map((it) => ({
          id: it.id,
          sku: it.sku || it.id,
          name: it.name,
          price: it.price,
          mrp: it.mrp || Math.round(it.price * 1.15),
          qty: it.qty,
          variant: it.variant,
          image: it.image,
        })),
        totalAmount: cartTotal,
        finalPayableAmount: cartTotal,
        status: 'REQUESTED' as const,
        paymentStatus: 'PENDING' as const,
        orderNotes: orderNotes.trim(),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOrderSuccess(true);
        clearCart();
        // Redirect to orders management tab in profile
        setTimeout(() => {
          router.push('/profile?tab=orders&newOrder=true');
        }, 1200);
      } else {
        alert(data.error || 'Failed to submit order request. Please try again.');
      }
    } catch (err: any) {
      alert('Network error while requesting order: ' + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // -------------------------------------------------------------
  // NEW / FIRST-TIME USER: WHATSAPP FIRST ORDER REQUEST
  // -------------------------------------------------------------
  const handleFirstOrderWhatsApp = () => {
    if (cartItems.length === 0) return;
    setIsGuestModalOpen(true);
  };

  const handleConfirmFirstOrderWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestMobile.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit WhatsApp mobile number.');
      return;
    }

    const leadItems = cartItems.map((it) => ({
      name: it.name,
      qty: it.qty,
      price: it.price,
      variant: it.variant,
    }));

    // Record lead so admin sees customer checkout inquiries
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: guestName,
        mobile: guestMobile,
        cartItems: leadItems,
        topic: 'First Time Order via WhatsApp',
      }),
    }).catch((e) => console.log('Lead record notice:', e));

    const waUrl = getWhatsAppFirstOrderUrl(
      leadItems,
      guestName,
      guestMobile
    );

    setIsGuestModalOpen(false);
    window.open(waUrl, '_blank');
  };

  if (!mounted) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 flex flex-col justify-center items-center space-y-3">
        <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading your shopping cart...</p>
      </div>
    );
  }

  // Empty Cart State
  if (cartItems.length === 0 && !orderSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto my-12 bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/90 shadow-sm space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center mx-auto">
          <ShoppingCart className="w-10 h-10 text-teal-700" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Your Cart is Empty
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            You haven&apos;t added any Amway products to your cart yet. Explore our genuine wellness, nutrition, beauty, and home essentials.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/products"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-sm shadow-md transition-all"
          >
            Explore All Products →
          </Link>
          <a
            href={getWhatsAppContactUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>WhatsApp Consultation</span>
          </a>
        </div>
      </div>
    );
  }

  // Order Success Screen
  if (orderSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto my-12 bg-white rounded-3xl p-10 sm:p-14 text-center border border-emerald-200 shadow-xl space-y-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-4xl mx-auto shadow-inner">
          ✓
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          Order Request Received!
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Your order request is now in our admin review queue. Our team will verify factory stock, apply your direct member savings, and generate your official invoice bill.
        </p>
        <p className="text-xs text-teal-800 font-bold animate-pulse">
          Redirecting to your Orders Management Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto pb-24 sm:pb-8">
      {/* Navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-800 hover:text-teal-950 transition-colors bg-white px-3 sm:px-3.5 py-2 rounded-xl border border-teal-200 shadow-2xs w-fit cursor-pointer"
        >
          <span>←</span>
          <span>Continue Browsing Catalog</span>
        </Link>
        <div className="text-xs text-slate-500">
          Showing <strong className="text-slate-900">{cartItems.length}</strong> items in cart
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Cart Items & Shipping Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-black text-base sm:text-lg text-slate-900">
                Cart Items ({cartItems.length})
              </h2>
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
              >
                Clear Cart
              </button>
            </div>

            {/* Items List */}
            <div className="divide-y divide-slate-100">
              {cartItems.map((item) => {
                const itemTotal = item.price * item.qty;
                const itemMrp = item.mrp && item.mrp > item.price ? item.mrp : Math.round(item.price * 1.15);
                const itemMrpTotal = itemMrp * item.qty;

                return (
                  <div key={item.id} className="py-3.5 sm:py-4 flex items-center gap-3 sm:gap-4">
                    {/* Thumbnail */}
                    <Link
                      href={`/product/${item.id}`}
                      onClick={() => recordNavigationOrigin('/cart', 'Cart')}
                      className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 p-1 flex items-center justify-center shrink-0 hover:border-teal-400 transition-colors"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain"
                        onError={(e: any) => {
                          e.target.src = 'https://placehold.co/100x100/F0FDFA/0F766E?text=Amway';
                        }}
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.id}`}
                        onClick={() => recordNavigationOrigin('/cart', 'Cart')}
                        className="font-extrabold text-xs sm:text-sm text-slate-900 truncate hover:text-teal-700 block transition-colors"
                      >
                        {item.name}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {item.variant && <span className="font-semibold text-teal-800">{item.variant}</span>}
                        {item.sku && <span>SKU: {item.sku}</span>}
                      </div>

                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-black text-xs sm:text-sm text-teal-900">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Quantity & Subtotal */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                        <button
                          onClick={() => handleDecrease(item)}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          -
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-slate-900">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => handleIncrease(item)}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right min-w-[70px] sm:min-w-[80px]">
                        <div className="font-black text-xs sm:text-sm text-slate-900">
                          ₹{itemTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer text-xs"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Shipping & Address Input (When Authenticated) */}
          {isAuthenticated && user && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Confirm Shipping Destination</span>
                </span>
                <span className="text-[11px] text-teal-800 font-semibold">
                  Verified Member: {user.name}
                </span>
              </div>

              <div>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Street address, apartment, locality, city, state, pincode..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-teal-600 focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Order notes / delivery instructions (optional)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-teal-600 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Social Clarification & Support Banner */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-slate-800">Need clarification about any product?</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Connect directly with our wellness consultant via WhatsApp, Instagram, or LinkedIn.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <a
                href={getWhatsAppContactUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp</span>
              </a>
              <a
                href={SOCIAL_LINKS.youtubeUrl || 'https://www.youtube.com/@N_Square_Official'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#cc0000] hover:bg-[#b30000] text-white rounded-xl font-bold text-xs shadow-2xs transition-all"
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-bold text-xs shadow-2xs"
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0077b5] text-white rounded-xl font-bold text-xs shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 1 0 1.6 1.6 1.6 1.6 0 0 0-1.6-1.6Z"/>
                </svg>
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Summary & Checkout Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 pb-3 border-b border-slate-100">
              Order &amp; Pricing Summary
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span>Total Items Price:</span>
                <span className="font-bold text-slate-900 font-mono">
                  ₹{cartTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Payable
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-teal-950 mt-0.5 font-mono">
                    ₹{cartTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* CHECKOUT ACTION BUTTONS */}
            {isAuthenticated && user ? (
              /* Authenticated User: Submit Direct Order Request */
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleSubmitDirectOrder}
                  disabled={isSubmittingOrder}
                  className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>✓</span>
                  <span>{isSubmittingOrder ? 'Submitting Order Request...' : 'Submit Order Request'}</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                  Admin will review your request, apply your direct member discount, and generate your official bill in your account dashboard.
                </p>
              </div>
            ) : (
              /* First-Time User: Request First Order via WhatsApp */
              <div className="space-y-3 pt-2">
                <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-xs text-amber-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>First-Time Ordering?</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    New users request their first order directly through WhatsApp. Our consultant will verify your products, apply maximum direct selling discounts, and issue your verified VIP access credentials.
                  </p>
                </div>

                <button
                  onClick={handleFirstOrderWhatsApp}
                  className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-white shrink-0" />
                  <span>Request First Order via WhatsApp →</span>
                </button>

                <div className="text-center pt-1">
                  <span className="text-xs text-slate-500">Already a verified customer? </span>
                  <Link
                    href="/profile"
                    className="text-xs font-bold text-teal-800 hover:underline"
                  >
                    Login to your Account →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guest WhatsApp First-Order Modal */}
      {isGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-700 shrink-0" />
                <h3 className="font-black text-base sm:text-lg text-slate-900">
                  Request First Order on WhatsApp
                </h3>
              </div>
              <button
                onClick={() => setIsGuestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your name and WhatsApp number. Your entire cart and direct discount inquiry will be automatically formatted for our wellness consultant.
            </p>

            <form onSubmit={handleConfirmFirstOrderWhatsApp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-teal-600 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp Mobile Number
                </label>
                <input
                  type="tel"
                  value={guestMobile}
                  onChange={(e) => setGuestMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-teal-600 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Open WhatsApp →</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
