'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ShoppingCart, ShieldCheck, HelpCircle, ChevronRight, Check, Lock, RefreshCw, MessageSquare, AlertCircle, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';
import { CustomerOrder, AccountUpdateRequest } from '../../types/user';
import { CartItem } from '../../store/useCartStore';
import InvoiceModal from '../../components/admin/InvoiceModal';
import { SOCIAL_LINKS, getWhatsAppContactUrl } from '../../config/social';
import {
  saveProfileTabSession,
  getProfileTabSession,
  recordNavigationOrigin,
} from '../../utils/sessionManager';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const { items: cartItems, removeItem, updateQty, getTotalPrice, getTotalItems } = useCartStore();

  // Active Tab: 'cart' | 'orders' | 'profile' | 'request'
  const [activeTab, setActiveTab] = useState<'cart' | 'orders' | 'profile' | 'request'>('orders');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Login form state
  const [loginKey, setLoginKey] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Credentials Request Popup State (Unauthenticated)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [guestNote, setGuestNote] = useState('');

  // Orders and Requests data
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [requests, setRequests] = useState<AccountUpdateRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [viewingInvoiceOrder, setViewingInvoiceOrder] = useState<CustomerOrder | null>(null);

  const handleCustomerConfirmReceived = async (orderId: string) => {
    if (!confirm('Confirm that you have received your order in good condition?')) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          status: 'DELIVERED',
          deliveredAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success && user?.id) {
        loadUserOrders(user.id);
      }
    } catch (err) {
      alert('Failed to confirm receipt. Please check your network.');
    }
  };

  // New Request Form state - Relative inputs
  const [requestType, setRequestType] = useState<AccountUpdateRequest['requestType']>('ADDRESS_CHANGE');
  const [requestMessage, setRequestMessage] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [desiredPassword, setDesiredPassword] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestError, setRequestError] = useState('');

  // Prefill relative fields when user changes
  useEffect(() => {
    if (user) {
      setNewName(user.name || '');
      setNewMobile(user.mobile || '');
      setNewEmail(user.email || '');
      if (user.address) {
        setNewStreet(user.address.street || '');
        setNewCity(user.address.city || '');
        setNewState(user.address.state || '');
        setNewPincode(user.address.pincode || '');
      }
    }
  }, [user]);

  // Load user-specific orders and account requests when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadUserOrders(user.id);
      loadUserRequests(user.id);
    }
  }, [isAuthenticated, user?.id]);

  // Restore and sync active profile tab with URL params and session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as 'cart' | 'orders' | 'profile' | 'request' | null;
      if (tabParam && ['cart', 'orders', 'profile', 'request'].includes(tabParam)) {
        setActiveTab(tabParam);
        saveProfileTabSession(tabParam);
      } else {
        const savedTab = getProfileTabSession() as 'cart' | 'orders' | 'profile' | 'request' | null;
        if (savedTab && ['cart', 'orders', 'profile', 'request'].includes(savedTab)) {
          setActiveTab(savedTab);
        }
      }
    }
  }, []);

  // Sync tab changes into session
  useEffect(() => {
    saveProfileTabSession(activeTab);
  }, [activeTab]);

  const loadUserOrders = async (userId: string) => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/orders?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadUserRequests = async (userId: string) => {
    setRequestsLoading(true);
    try {
      const res = await fetch(`/api/account-requests?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if ((data.success || data.requests) && Array.isArray(data.requests)) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginKey.trim() || !password.trim()) {
      setLoginError('Please enter both your identifier and password.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginKey: loginKey.trim(), password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Authentication failed. Please check credentials.');
        return;
      }

      // Successful login
      login(data.user);
      setActiveTab('orders');
    } catch (err) {
      setLoginError('Network error while connecting. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setRequestSubmitting(true);
    setRequestSuccess('');
    setRequestError('');

    let payloadRequestedData: AccountUpdateRequest['requestedData'] = undefined;
    let finalMessage = requestMessage.trim();

    if (requestType === 'ADDRESS_CHANGE') {
      if (!newStreet.trim() || !newCity.trim() || !newPincode.trim()) {
        setRequestError('Please provide at least Street, City, and Pincode for your new delivery address.');
        setRequestSubmitting(false);
        return;
      }
      payloadRequestedData = {
        address: {
          street: newStreet.trim(),
          city: newCity.trim(),
          state: newState.trim(),
          pincode: newPincode.trim(),
        },
      };
      if (!finalMessage) {
        finalMessage = `Please update my registered delivery address to: ${newStreet.trim()}, ${newCity.trim()}, ${newState.trim()} - ${newPincode.trim()}`;
      }
    } else if (requestType === 'PROFILE_UPDATE') {
      if (!newName.trim() && !newMobile.trim() && !newEmail.trim()) {
        setRequestError('Please specify the new name, mobile, or email you would like to update.');
        setRequestSubmitting(false);
        return;
      }
      payloadRequestedData = {
        profile: {
          name: newName.trim() || user.name,
          mobile: newMobile.trim() || user.mobile,
          email: newEmail.trim() || (user.email || ''),
        },
      };
      if (!finalMessage) {
        finalMessage = `Please update my profile credentials to: Name: ${newName.trim() || user.name}, Mobile: ${newMobile.trim() || user.mobile}${newEmail ? `, Email: ${newEmail.trim()}` : ''}`;
      }
    } else if (requestType === 'PASSWORD_RESET') {
      payloadRequestedData = {
        newPassword: desiredPassword.trim() || undefined,
      };
      if (!finalMessage) {
        finalMessage = desiredPassword.trim()
          ? `Requesting custom password update to requested new password.`
          : `Requesting administrator to reset my account password.`;
      }
    } else if (requestType === 'GENERAL_INQUIRY') {
      if (!finalMessage) {
        setRequestError('Please provide details for your inquiry.');
        setRequestSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/account-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          userMobile: user.mobile,
          requestType,
          message: finalMessage,
          requestedData: payloadRequestedData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setRequestError(data.error || 'Failed to submit request.');
        return;
      }

      setRequestSuccess('Your update request has been securely submitted to the Admin Portal. The administrator will review and verify your request shortly.');
      setRequestMessage('');
      loadUserRequests(user.id);
    } catch (err) {
      setRequestError('Network error submitting request. Please try again.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const handleRequestCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestMobile.trim()) return;
    const msg = encodeURIComponent(
      `Hello Admin, I would like to request login credentials for N-Square Store.\nName: ${guestName.trim()}\nMobile: ${guestMobile.trim()}${guestNote.trim() ? `\nNote: ${guestNote.trim()}` : ''}`
    );
    window.open(`https://wa.me/919876543210?text=${msg}`, '_blank');
    setShowCredentialsModal(false);
  };

  if (!mounted) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: UNAUTHENTICATED STATE
  // -------------------------------------------------------------
  if (!isAuthenticated || !user) {
    return (
      <div className="w-full flex justify-center pt-1 sm:pt-2 pb-10">
        <div className="w-full max-w-md">
          {/* Title & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Login</h1>
            <p className="text-sm text-slate-600 mt-1">Login to track orders, invoices, and your synced wellness cart.</p>
          </div>

          {/* Info Alert */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 mb-6 shadow-xs text-xs text-amber-950 leading-relaxed text-center sm:text-left">
            Access credentials will be provided only by admin, Please request admin by{' '}
            <button
              type="button"
              onClick={() => setShowCredentialsModal(true)}
              className="text-teal-800 font-bold underline hover:text-teal-900 cursor-pointer"
            >
              clicking here
            </button>.
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={loginKey}
                  onChange={(e) => setLoginKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600 focus:bg-white outline-none transition-all font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600 focus:bg-white outline-none transition-all font-medium text-slate-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 text-sm cursor-pointer text-center"
                >
                  {loginLoading ? 'Logging in...' : 'Login'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCredentialsModal(true)}
                  className="flex-1 py-3 px-4 border border-teal-600/40 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-xl shadow-xs transition-all text-sm cursor-pointer text-center"
                >
                  Request Credentials
                </button>
              </div>
            </form>
          </div>

          {/* Credentials Request Modal */}
          {showCredentialsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeInOverlay">
              <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden p-6 animate-drawerSlideIn">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900">Request Access Credentials</h3>
                  <button
                    type="button"
                    onClick={() => setShowCredentialsModal(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleRequestCredentialsSubmit} className="mt-4 space-y-3.5">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Please provide your basic details. You will be redirected to WhatsApp to connect with the admin.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={guestMobile}
                      onChange={(e) => setGuestMobile(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Note (Optional)</label>
                    <textarea
                      rows={2}
                      value={guestNote}
                      onChange={(e) => setGuestNote(e.target.value)}
                      placeholder="e.g. Interested products or inquiry details"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-teal-600"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCredentialsModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Connect via WhatsApp
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }


  // -------------------------------------------------------------
  // RENDER: AUTHENTICATED CUSTOMER PORTAL
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-700 text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{user.name}</h1>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  <span>✓</span>
                  <span>Verified Customer</span>
                </span>
                <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
                  {user.id}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                📱 {user.mobile} {user.email ? `• ✉️ ${user.email}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <Link
              href="/"
              className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              🛍️ Shop Store
            </Link>
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation with Theme Matching Icons & Scroll Hint */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto touch-scroll no-scrollbar">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'orders'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Orders &amp; Tracking</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cart')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'cart'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>Active Cart</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'cart' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {getTotalItems()}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'profile'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Verified Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('request')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'request'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Support Request</span>
            {requests.filter(r => r.status === 'OPEN').length > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
                {requests.filter(r => r.status === 'OPEN').length}
              </span>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PREVIOUS ORDERS & TRACKING */}
        {/* ========================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Your Orders &amp; Consignments</h2>
                <p className="text-xs text-slate-500">Track shipments directly dispatched from Amway authorized fulfillment hubs.</p>
              </div>
              <button
                onClick={() => user?.id && loadUserOrders(user.id)}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {ordersLoading ? (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400 text-sm">
                Loading your order history...
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800 text-base mb-1">No Orders Processed Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                  When you submit an order request from your cart, your order flow, bill, live tracking, and official invoices will appear here in real time.
                </p>
                <button
                  onClick={() => setActiveTab('cart')}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  View Your Active Cart
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {orders.map((order) => {
                  const isPendingReview = order.status === 'REQUESTED' || order.status === 'PENDING';
                  const isApproved = order.status === 'APPROVED' || order.status === 'CONFIRMED';
                  const isPaid = order.status === 'PAID';
                  const isDispatched = order.status === 'DISPATCHED';
                  const isDelivered = order.status === 'DELIVERED';

                  const finalPayable =
                    order.finalPayableAmount ??
                    Math.max(0, order.totalAmount - (order.discountAmount || 0) + (order.deliveryCharge || 0));

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 hover:border-slate-300 transition-all space-y-4"
                    >
                      {/* Top Row: Order ID, Invoice # & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                              {order.id}
                            </span>
                            {order.invoiceNumber && (
                              <span className="text-[10px] font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-bold">
                                {order.invoiceNumber}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${isPendingReview
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : isApproved
                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                    : isPaid
                                      ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                      : isDispatched
                                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                                        : isDelivered
                                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                          : 'bg-rose-100 text-rose-900 border-rose-300'
                                }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 mt-0.5 block">
                            Requested on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-xs text-slate-400 block font-medium">Final Payable</span>
                          <span className="text-lg font-black text-teal-950 font-mono">
                            {formatCurrency(finalPayable)}
                          </span>
                          {order.discountAmount && order.discountAmount > 0 ? (
                            <span className="text-[10px] text-emerald-700 font-bold block">
                              Includes -{formatCurrency(order.discountAmount)} Discount
                            </span>
                          ) : null}
                          {order.deliveryCharge && order.deliveryCharge > 0 ? (
                            <span className="text-[10px] text-slate-700 font-bold block">
                              +{formatCurrency(order.deliveryCharge)} Delivery Charge
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Transparent 5-Stage Step Flow Progress */}
                      <div className="bg-slate-50/80 rounded-2xl p-3 sm:p-4 border border-slate-200/70 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Order Fulfillment Pipeline:
                        </div>
                        <div className="grid grid-cols-5 gap-1 sm:gap-2 text-center text-[10px] font-bold">
                          {/* 1. Requested */}
                          <div
                            className={`p-1.5 sm:p-2 rounded-xl transition-all ${isPendingReview
                                ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                                : 'bg-emerald-100 text-emerald-900'
                              }`}
                          >
                            1. Requested
                          </div>

                          {/* 2. Approved */}
                          <div
                            className={`p-1.5 sm:p-2 rounded-xl transition-all ${isApproved
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : isPaid || isDispatched || isDelivered
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-200/60 text-slate-400'
                              }`}
                          >
                            2. Approved &amp; Bill
                          </div>

                          {/* 3. Payment */}
                          <div
                            className={`p-1.5 sm:p-2 rounded-xl transition-all ${isPaid
                                ? 'bg-indigo-600 text-white font-black shadow-xs'
                                : isDispatched || isDelivered
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-200/60 text-slate-400'
                              }`}
                          >
                            3. Payment
                          </div>

                          {/* 4. Dispatched */}
                          <div
                            className={`p-1.5 sm:p-2 rounded-xl transition-all ${isDispatched
                                ? 'bg-purple-600 text-white font-black shadow-xs'
                                : isDelivered
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-200/60 text-slate-400'
                              }`}
                          >
                            4. Dispatched
                          </div>

                          {/* 5. Delivered */}
                          <div
                            className={`p-1.5 sm:p-2 rounded-xl transition-all ${isDelivered
                                ? 'bg-emerald-600 text-white font-black shadow-xs'
                                : 'bg-slate-200/60 text-slate-400'
                              }`}
                          >
                            5. Delivered
                          </div>
                        </div>

                        {/* Transparent Explainer Banner */}
                        <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                          <span className="text-sm shrink-0">ℹ️</span>
                          <span className="leading-relaxed">
                            {isPendingReview && (
                              <span>
                                Your order request was received by the admin team. We are checking warehouse inventory and applying your direct selling discounts.
                              </span>
                            )}
                            {isApproved && (
                              <span>
                                Order accepted! Your official invoice bill has been generated ({order.invoiceNumber}). Please complete payment using the details shared by your consultant.
                              </span>
                            )}
                            {isPaid && (
                              <span>
                                Payment confirmed ({order.paymentMethod || 'Online'}). Your factory-sealed products are being packed for regional hub dispatch.
                              </span>
                            )}
                            {isDispatched && (
                              <span>
                                Dispatched via <strong>{order.courierName || 'Courier'}</strong>! Consignment tracking is live. Click &ldquo;Track Package Live&rdquo; below to monitor courier progress.
                              </span>
                            )}
                            {isDelivered && (
                              <span>
                                Delivered and confirmed received. Thank you for choosing N-Square Store for genuine Amway wellness essentials!
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Shipment Live Courier Tracking Box */}
                      {order.trackingNumber && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center text-lg shrink-0">
                              🚚
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900 block">
                                Courier: {order.courierName || 'Regional Courier'}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  AWB: {order.trackingNumber}
                                </span>
                                <span className="text-[10px] bg-teal-200 text-teal-900 px-2 py-0.5 rounded-full font-bold">
                                  {isDelivered ? 'Delivered' : 'In Transit'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {order.trackingUrl && (
                              <a
                                href={order.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                              >
                                <span>Track Package Live</span>
                                <span>↗</span>
                              </a>
                            )}

                            {isDispatched && (
                              <button
                                onClick={() => handleCustomerConfirmReceived(order.id)}
                                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <span>✓</span>
                                <span>I Received My Order</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Items List */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Requested Products ({order.items.length})
                        </span>
                        <div className="divide-y divide-slate-100">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-2">
                              {item.id ? (
                                <Link
                                  href={`/product/${item.id}`}
                                  onClick={() => recordNavigationOrigin('/profile?tab=orders', 'My Orders')}
                                  className="flex items-center gap-2.5 min-w-0 hover:text-teal-700 transition-colors group cursor-pointer"
                                >
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-9 h-9 object-contain rounded-lg border border-slate-100 bg-white shrink-0 group-hover:border-teal-400 transition-colors"
                                      onError={(e: any) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900 group-hover:text-teal-800 transition-colors block truncate">{item.name}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {item.variant ? `Variant: ${item.variant} • ` : ''}Qty: {item.qty}
                                    </span>
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-9 h-9 object-contain rounded-lg border border-slate-100 bg-white shrink-0"
                                      onError={(e: any) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {item.variant ? `Variant: ${item.variant} • ` : ''}Qty: {item.qty}
                                    </span>
                                  </div>
                                </div>
                              )}
                              <div className="text-right shrink-0 font-mono">
                                <span className="font-bold text-slate-900 block">
                                  {formatCurrency(item.price * item.qty)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Order Pricing Breakdown (Only shown if discount or delivery charge applied) */}
                      {(Boolean(order.discountAmount && order.discountAmount > 0) || Boolean(order.deliveryCharge && order.deliveryCharge > 0)) && (
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs space-y-1">
                          <div className="flex justify-between text-slate-500">
                            <span>Items Subtotal:</span>
                            <span className="font-mono">{formatCurrency(order.totalAmount)}</span>
                          </div>
                          {order.discountAmount && order.discountAmount > 0 ? (
                            <div className="flex justify-between text-emerald-700 font-semibold">
                              <span>Discount {order.discountNote ? `(${order.discountNote})` : ''}:</span>
                              <span className="font-mono">- {formatCurrency(order.discountAmount)}</span>
                            </div>
                          ) : null}
                          {order.deliveryCharge && order.deliveryCharge > 0 ? (
                            <div className="flex justify-between text-slate-700 font-semibold">
                              <span>Delivery / Additional Fee {order.deliveryChargeNote ? `(${order.deliveryChargeNote})` : ''}:</span>
                              <span className="font-mono">+ {formatCurrency(order.deliveryCharge)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                            <span>Total Payable:</span>
                            <span className="text-teal-950 font-mono">{formatCurrency(finalPayable)}</span>
                          </div>
                        </div>
                      )}

                      {/* Bottom Action Bar: Invoice, Address & Social Connect */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="text-slate-500">
                          <strong className="text-slate-700">Delivery Address: </strong>
                          <span>{order.shippingAddress || 'Customer Address on Record'}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setViewingInvoiceOrder(order)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>📄</span>
                            <span>View Bill &amp; Invoice</span>
                          </button>

                          <a
                            href={getWhatsAppContactUrl(`Hi N-Square Store, regarding my order ${order.id}:`)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Ask on WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ACTIVE SYNCED CART */}
        {/* ========================================================= */}
        {activeTab === 'cart' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Your Active Cart</h2>
                <p className="text-xs text-slate-500">
                  Cart is synchronized with your consultant&apos;s master portal for instant order placement and verification.
                </p>
              </div>
            </div>

            {cartItems.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
                <span className="text-4xl block mb-3">🛒</span>
                <h3 className="font-bold text-slate-800 text-base mb-1">Your Cart is Empty</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  Browse Amway nutritional, beauty, and personal care products to add genuine items to your order.
                </p>
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs inline-block"
                >
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                <div className="space-y-3 divide-y divide-slate-100">
                  {cartItems.map((item: CartItem) => (
                    <div key={`${item.id}-${item.variant || ''}`} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                      <Link
                        href={`/product/${item.id}`}
                        onClick={() => recordNavigationOrigin('/profile?tab=cart', 'My Cart')}
                        className="flex items-center gap-3 min-w-0 hover:text-teal-700 transition-colors group cursor-pointer"
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-12 h-12 object-contain rounded-xl border border-slate-100 bg-white shrink-0 group-hover:border-teal-400 transition-colors" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-lg shrink-0">🌿</div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-800 transition-colors truncate">{item.name}</h4>
                          {item.variant && <span className="text-[11px] text-slate-400 block">{item.variant}</span>}
                          <span className="text-xs font-extrabold text-teal-800">{formatCurrency(item.price)}</span>
                        </div>
                      </Link>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-slate-50">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-red-600 text-xs p-1"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Total & Action */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block">Total Cart Value</span>
                    <span className="text-xl font-black text-slate-900">{formatCurrency(getTotalPrice())}</span>
                  </div>

                  <a
                    href={`https://wa.me/919876543210?text=${encodeURIComponent(
                      `Hello N-Square Store, I am verified user ${user.name} (${user.id}). Please review and process my active cart (${getTotalItems()} items, total ${formatCurrency(getTotalPrice())}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>💬</span>
                    <span>Submit Order Request</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: VERIFIED PROFILE (READ-ONLY) */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Verified Member Profile</h2>
              <p className="text-xs text-slate-500">
                Official customer credentials verified and authorized by your N-Square Store consultant.
              </p>
            </div>

            {/* Read-Only Notice Box */}
            <div className="bg-slate-100 border border-slate-200/80 rounded-2xl p-4 flex gap-3 text-xs text-slate-700">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold text-slate-900 block mb-0.5">Admin Managed Profile</strong>
                In accordance with authorized direct selling guidelines, customers cannot directly edit contact details, shipping addresses, or passwords. This ensures shipment accuracy and account protection. To modify any detail, submit an in-app request using the button below.
              </div>
            </div>

            {/* Profile Grid */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                    <span>Customer Full Name</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 flex items-center justify-between">
                    <span>{user.name}</span>
                    <span className="text-xs text-slate-400">Locked</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                    <span>Verified Mobile Number</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 flex items-center justify-between">
                    <span>{user.mobile}</span>
                    <span className="text-xs text-emerald-600 font-bold">Verified</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                    <span>Email Address</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 flex items-center justify-between">
                    <span>{user.email || 'Not provided'}</span>
                    <span className="text-xs text-slate-400">Locked</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                    <span>Account Password</span>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700 flex items-center justify-between">
                    <span>••••••••••••</span>
                    <span className="text-xs text-slate-400">Admin Managed</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address Section */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <span>Registered Delivery Address</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </span>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800">
                  {user.address?.street ? (
                    <div>
                      <p className="font-semibold text-slate-900">{user.address.street}</p>
                      <p className="text-slate-600">
                        {user.address.city}, {user.address.state} - {user.address.pincode}
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No delivery address saved yet. Admin will register address upon first order confirmation.</span>
                  )}
                </div>
              </div>

              {/* Action: Request Update */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-slate-500">Need to update your delivery address or contact number?</span>
                <button
                  onClick={() => setActiveTab('request')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>📝</span>
                  <span>Submit Update Request</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: REQUEST UPDATE (IN-APP APPLICATION ONLY) */}
        {/* ========================================================= */}
        {activeTab === 'request' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">Request Account / Details Update</h2>
              <p className="text-xs text-slate-500">
                Submit in-app change requests directly to your administrator. No social media or third-party channel required.
              </p>
            </div>

            {/* Submission Form */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
              <form onSubmit={handleCreateRequest} className="space-y-4">
                {requestSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
                    <span>✓</span>
                    <span>{requestSuccess}</span>
                  </div>
                )}
                {requestError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{requestError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    What would you like to update?
                  </label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-600 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="ADDRESS_CHANGE">🏠 Change Delivery / Shipping Address</option>
                    <option value="PROFILE_UPDATE">📱 Update Contact Number, Name, or Email</option>
                    <option value="PASSWORD_RESET">🔑 Custom Password Reset Request</option>
                    <option value="GENERAL_INQUIRY">💬 General Account / Order Inquiry</option>
                  </select>
                </div>

                {/* RELATIVE CONTEXT & STRUCTURED FIELDS BASED ON REQUEST TYPE */}
                {requestType === 'ADDRESS_CHANGE' && (
                  <div className="space-y-3 pt-1">
                    {/* Current Address Reference */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Current Address on Record:
                      </span>
                      <p className="font-semibold text-slate-800">
                        {user.address?.street
                          ? `${user.address.street}, ${user.address.city}, ${user.address.state} - ${user.address.pincode}`
                          : 'No delivery address saved yet.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-950 block">
                        New Delivery Address Details:
                      </span>
                      <input
                        type="text"
                        placeholder="Flat / House No, Building, Street, Locality..."
                        value={newStreet}
                        onChange={(e) => setNewStreet(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-teal-600"
                        required
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="City"
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-teal-600"
                          required
                        />
                        <input
                          type="text"
                          placeholder="State"
                          value={newState}
                          onChange={(e) => setNewState(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-teal-600"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Pincode"
                          value={newPincode}
                          onChange={(e) => setNewPincode(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-teal-600"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {requestType === 'PROFILE_UPDATE' && (
                  <div className="space-y-3 pt-1">
                    {/* Current Profile Reference */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Current Profile on Record:
                      </span>
                      <p className="font-semibold text-slate-800">
                        {user.name} • {user.mobile} {user.email ? `• ${user.email}` : ''}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-950 block">
                        New Information to Update:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">New Full Name</label>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-teal-600 font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">New WhatsApp Mobile</label>
                          <input
                            type="tel"
                            placeholder="10-digit mobile number"
                            value={newMobile}
                            onChange={(e) => setNewMobile(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-teal-600 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">New Email Address</label>
                        <input
                          type="email"
                          placeholder="Email Address (optional)"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-teal-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {requestType === 'PASSWORD_RESET' && (
                  <div className="space-y-3 pt-1">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Account Identifier:
                      </span>
                      <p className="font-semibold text-slate-800">
                        {user.name} ({user.mobile})
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-teal-950 block mb-1">
                        Desired New Password (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter desired password, or leave empty for auto-generated password"
                        value={desiredPassword}
                        onChange={(e) => setDesiredPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:bg-white focus:outline-teal-600"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Admin will verify your request and confirm the updated password via consultant WhatsApp.
                      </span>
                    </div>
                  </div>
                )}

                {/* Additional Note / Message */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {requestType === 'GENERAL_INQUIRY' ? 'Inquiry Details *' : 'Additional Notes / Instructions (Optional)'}
                  </label>
                  <textarea
                    rows={requestType === 'GENERAL_INQUIRY' ? 4 : 2}
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder={
                      requestType === 'GENERAL_INQUIRY'
                        ? 'Describe your question regarding products, usage, orders, or direct seller certification...'
                        : 'Any specific instructions (e.g. landmarks, preferred delivery time, urgency)...'
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-teal-600 focus:bg-white outline-none"
                    required={requestType === 'GENERAL_INQUIRY'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  <span>{requestSubmitting ? 'Submitting...' : '🚀 Submit Request to Administrator'}</span>
                </button>
              </form>
            </div>

            {/* Submitted Requests History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Your Past Update Requests ({requests.length})
                </h3>
                <button
                  onClick={() => user?.id && loadUserRequests(user.id)}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {requestsLoading ? (
                <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400">
                  Loading requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 border border-slate-200">
                  No update requests submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => {
                    const statusBadges: Record<string, string> = {
                      OPEN: 'bg-amber-50 text-amber-800 border-amber-200',
                      RESOLVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      REJECTED: 'bg-red-50 text-red-800 border-red-200',
                    };

                    return (
                      <div key={req.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">{req.id}</span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {req.requestType.replace('_', ' ')}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadges[req.status] || 'bg-slate-100 text-slate-700'}`}>
                            {req.status === 'OPEN' ? '⏳ Under Review' : req.status === 'RESOLVED' ? '✅ Resolved' : 'Declined'}
                          </span>
                        </div>

                        {req.requestedData?.address && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                              Requested New Delivery Address:
                            </span>
                            <p className="font-semibold text-slate-800">
                              {req.requestedData.address.street}, {req.requestedData.address.city}, {req.requestedData.address.state} - {req.requestedData.address.pincode}
                            </p>
                          </div>
                        )}
                        {req.requestedData?.profile && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                              Requested Profile Credentials:
                            </span>
                            <p className="font-semibold text-slate-800">
                              Name: {req.requestedData.profile.name || '-'} • Mobile: {req.requestedData.profile.mobile || '-'} {req.requestedData.profile.email ? `• Email: ${req.requestedData.profile.email}` : ''}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{req.message}</p>

                        {req.adminNotes && (
                          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-950">
                            <strong className="block text-[11px] text-teal-900 font-bold mb-0.5">👨‍💼 Administrator Response:</strong>
                            {req.adminNotes}
                          </div>
                        )}

                        <span className="text-[10px] text-slate-400 block pt-1">
                          Submitted on {new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Modal for Customer */}
      {viewingInvoiceOrder && (
        <InvoiceModal
          order={viewingInvoiceOrder}
          onClose={() => setViewingInvoiceOrder(null)}
        />
      )}
    </div>
  );
}
