'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Edit2,
  ShieldCheck,
  ShoppingCart,
  Package,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Truck,
  CheckCircle,
  FileText,
  Trash2,
  Lock,
  UserCheck,
  Bell,
  Zap,
  Search,
} from 'lucide-react';
import { UserAccount, CustomerOrder, AccountUpdateRequest } from '../../../../types/user';
import { SOCIAL_LINKS, getWhatsAppContactUrl } from '../../../../config/social';
import InvoiceModal from '../../../../components/admin/InvoiceModal';
import AdminPinLock from '../../../../components/admin/AdminPinLock';
import { adminFetch } from '../../../../utils/adminFetch';

export const dynamic = 'force-dynamic';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = (params?.id as string) || '';

  // Auth & Admin Lock State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Customer Data State
  const [user, setUser] = useState<UserAccount | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [requests, setRequests] = useState<AccountUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'requests' | 'cart'>('orders');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Workflow Modals & Actions
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<CustomerOrder | null>(null);
  const [editingPricingOrderId, setEditingPricingOrderId] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discountNoteInput, setDiscountNoteInput] = useState('');
  const [deliveryChargeInput, setDeliveryChargeInput] = useState('');
  const [deliveryNoteInput, setDeliveryNoteInput] = useState('');

  // Payment Recording
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentMethodInput, setPaymentMethodInput] = useState<'UPI' | 'NET_BANKING' | 'CARD' | 'COD' | 'CASH'>('UPI');
  const [paymentRefInput, setPaymentRefInput] = useState('');

  // Dispatch Courier
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [courierInput, setCourierInput] = useState('Blue Dart Express');
  const [trackingNumInput, setTrackingNumInput] = useState('');
  const [trackingUrlInput, setTrackingUrlInput] = useState('');

  // Edit User Modal
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
  });

  // Add Consignment Order Modal
  const [addOrderModalOpen, setAddOrderModalOpen] = useState(false);
  const [newOrderItems, setNewOrderItems] = useState<Array<{ id: string; name: string; price: number; qty: number; variant?: string }>>([]);
  const [newOrderDiscount, setNewOrderDiscount] = useState('0');
  const [newOrderDelivery, setNewOrderDelivery] = useState('0');

  // Request Resolution Notes
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Verify Admin Session Token on Mount
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
      setCheckingAuth(false);
    }
  }, []);

  // 2. Fetch Customer Details, Orders, and Requests
  const loadCustomerData = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      // User Profile
      const uRes = await adminFetch(`/api/users?id=${encodeURIComponent(customerId)}`);
      const uData = await uRes.json();
      if (uData.user) {
        setUser(uData.user);
        setEditFormData({
          name: uData.user.name || '',
          mobile: uData.user.mobile || '',
          email: uData.user.email || '',
          password: uData.user.password || '',
          street: uData.user.address?.street || '',
          city: uData.user.address?.city || '',
          state: uData.user.address?.state || '',
          pincode: uData.user.address?.pincode || '',
          notes: uData.user.notes || '',
          status: uData.user.status || 'ACTIVE',
        });
      }

      // Customer Orders
      const oRes = await adminFetch(`/api/orders?userId=${encodeURIComponent(customerId)}`);
      const oData = await oRes.json();
      if (oData.orders && Array.isArray(oData.orders)) {
        setOrders(oData.orders);
      }

      // Customer Support & Account Update Requests
      const rRes = await adminFetch(`/api/account-requests?userId=${encodeURIComponent(customerId)}`);
      const rData = await rRes.json();
      if (rData.requests && Array.isArray(rData.requests)) {
        setRequests(rData.requests);
      }
    } catch (e) {
      console.error('Failed to load customer details:', e);
      showToast('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminUnlocked && customerId) {
      loadCustomerData();
    }
  }, [isAdminUnlocked, customerId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Metrics
  const userMetrics = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const totalSpent = validOrders.reduce((sum, o) => {
      const discount = o.discountAmount || 0;
      const delivery = o.deliveryCharge || 0;
      const amount = o.finalPayableAmount ?? Math.max(0, o.totalAmount - discount + delivery);
      return sum + amount;
    }, 0);
    const pendingOrders = orders.filter((o) => o.status === 'REQUESTED' || o.status === 'PENDING');
    const openRequests = requests.filter((r) => r.status === 'OPEN');
    return {
      ordersCount: orders.length,
      deliveredCount: orders.filter((o) => o.status === 'DELIVERED').length,
      inTransitCount: orders.filter((o) => o.status === 'DISPATCHED').length,
      totalSpent,
      pendingOrdersCount: pendingOrders.length,
      openRequestsCount: openRequests.length,
      cartCount: user?.cart ? user.cart.reduce((sum, c) => sum + (c.qty || 1), 0) : 0,
    };
  }, [orders, requests, user]);

  // Order Actions
  const handleApproveOrder = async (order: CustomerOrder) => {
    setIsSubmitting(true);
    try {
      const discount = editingPricingOrderId === order.id ? Number(discountInput) || 0 : (order.discountAmount || 0);
      const discountNote = editingPricingOrderId === order.id ? discountNoteInput : (order.discountNote || '');
      const delivery = editingPricingOrderId === order.id ? Number(deliveryChargeInput) || 0 : (order.deliveryCharge || 0);
      const deliveryNote = editingPricingOrderId === order.id ? deliveryNoteInput : (order.deliveryChargeNote || '');
      const finalPayable = Math.max(0, order.totalAmount - discount + delivery);
      const invoiceNum = order.invoiceNumber || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const res = await adminFetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'APPROVED',
          discountAmount: discount,
          discountNote,
          deliveryCharge: delivery,
          deliveryChargeNote: deliveryNote,
          finalPayableAmount: finalPayable,
          invoiceNumber: invoiceNum,
          invoiceDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingPricingOrderId(null);
        showToast(`Order ${order.id} approved & bill generated!`);
        loadCustomerData();
      } else {
        alert(data.error || 'Failed to approve order');
      }
    } catch (err: any) {
      alert('Error updating order: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineOrder = async (order: CustomerOrder) => {
    if (!confirm(`Decline order request ${order.id}?`)) return;
    setIsSubmitting(true);
    try {
      const res = await adminFetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status: 'CANCELLED' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Order cancelled.');
        loadCustomerData();
      }
    } catch (err: any) {
      alert('Error declining order: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (order: CustomerOrder) => {
    setIsSubmitting(true);
    try {
      const res = await adminFetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'PAID',
          paymentStatus: 'PAID',
          paymentMethod: paymentMethodInput,
          paymentRefNumber: paymentRefInput || `UTR-${Date.now().toString().slice(-6)}`,
          paidAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentOrderId(null);
        setPaymentRefInput('');
        showToast('Payment successfully recorded!');
        loadCustomerData();
      } else {
        alert(data.error || 'Failed to update payment');
      }
    } catch (err: any) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchOrder = async (order: CustomerOrder) => {
    if (!trackingNumInput.trim()) {
      alert('Please enter a tracking / AWB number.');
      return;
    }
    setIsSubmitting(true);
    try {
      let finalTrackingUrl = trackingUrlInput.trim();
      if (!finalTrackingUrl) {
        if (courierInput.toLowerCase().includes('delhivery')) {
          finalTrackingUrl = `https://www.delhivery.com/track/package/${trackingNumInput.trim()}`;
        } else if (courierInput.toLowerCase().includes('blue')) {
          finalTrackingUrl = `https://www.bluedart.com/tracking`;
        } else {
          finalTrackingUrl = `https://www.google.com/search?q=${encodeURIComponent(courierInput + ' ' + trackingNumInput)}`;
        }
      }

      const res = await adminFetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'DISPATCHED',
          courierName: courierInput,
          trackingNumber: trackingNumInput.trim(),
          trackingUrl: finalTrackingUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDispatchOrderId(null);
        setTrackingNumInput('');
        setTrackingUrlInput('');
        showToast('Shipment marked as dispatched with live tracking!');
        loadCustomerData();
      } else {
        alert(data.error || 'Failed to dispatch order');
      }
    } catch (err: any) {
      alert('Error marking dispatched: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelivered = async (order: CustomerOrder) => {
    if (!confirm(`Confirm that order ${order.id} was delivered to ${user?.name}?`)) return;
    setIsSubmitting(true);
    try {
      const res = await adminFetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'DELIVERED',
          deliveredAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Order confirmed delivered!');
        loadCustomerData();
      }
    } catch (err: any) {
      alert('Error marking delivered: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Delete order consignment ${orderId}? This action cannot be undone.`)) return;
    try {
      const res = await adminFetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Order consignment deleted.');
        loadCustomerData();
      }
    } catch (e: any) {
      alert('Error deleting order: ' + e.message);
    }
  };

  // Toggle User Status
  const handleToggleStatus = async () => {
    if (!user) return;
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await adminFetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Customer account marked as ${nextStatus}.`);
        loadCustomerData();
      }
    } catch (e: any) {
      alert('Error updating status: ' + e.message);
    }
  };

  // Delete Customer Account
  const handleDeleteUser = async () => {
    if (!user) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete customer account "${user.name}" (${user.id})? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await adminFetch(`/api/users?id=${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Customer account permanently deleted.');
        setTimeout(() => {
          router.push('/admin/customers');
        }, 600);
      } else {
        alert(data.error || 'Failed to delete customer');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Edited Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const res = await adminFetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: editFormData.name.trim(),
          mobile: editFormData.mobile.trim(),
          email: editFormData.email.trim(),
          password: editFormData.password.trim(),
          address: {
            street: editFormData.street.trim(),
            city: editFormData.city.trim(),
            state: editFormData.state.trim(),
            pincode: editFormData.pincode.trim(),
          },
          notes: editFormData.notes.trim(),
          status: editFormData.status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Customer profile & credentials updated successfully!');
        setEditUserModalOpen(false);
        loadCustomerData();
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (err: any) {
      alert('Network error updating user: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert Cart to Confirmed Order
  const handleConvertCartToOrder = async () => {
    if (!user || !user.cart || user.cart.length === 0) return;
    if (!confirm(`Create official order consignment from ${user.name}'s active shopping cart (${user.cart.length} items)?`)) return;

    setIsSubmitting(true);
    try {
      const totalAmount = user.cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
      const formattedAddress = user.address?.street
        ? `${user.address.street}, ${user.address.city || ''} ${user.address.state || ''} - ${user.address.pincode || ''}`
        : 'Registered customer address';

      const res = await adminFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          userMobile: user.mobile,
          userEmail: user.email || '',
          shippingAddress: formattedAddress,
          items: user.cart.map((c) => ({
            id: c.id,
            name: c.name,
            qty: c.qty || 1,
            price: c.price,
            variant: c.variant,
            image: c.image || undefined,
          })),
          totalAmount,
          totalMrp: Math.round(totalAmount * 1.15),
          savings: Math.round(totalAmount * 0.15),
          status: 'REQUESTED',
          paymentStatus: 'PENDING',
          orderNotes: 'Created by consultant from live synchronized shopping cart.',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Order consignment ${data.order.id} registered!`);
        // Clear user cart after conversion
        await adminFetch(`/api/users/${user.id}/cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart: [] }),
        });
        loadCustomerData();
        setActiveTab('orders');
      } else {
        alert(data.error || 'Failed to create order from cart');
      }
    } catch (e: any) {
      alert('Error creating order: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolve In-App Request
  const handleResolveRequest = async (reqId: string, status: 'RESOLVED' | 'REJECTED') => {
    setIsSubmitting(true);
    try {
      const note = resolutionNotes[reqId]?.trim() || (status === 'RESOLVED' ? 'Verified and resolved by Administrator.' : 'Declined by Administrator.');
      const res = await adminFetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reqId,
          status,
          adminNotes: note,
        }),
      });
      if (res.ok) {
        showToast(`Request marked as ${status.toLowerCase()}`);
        loadCustomerData();
      }
    } catch (err: any) {
      alert('Error resolving request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Order Status Pill
  const renderOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
      case 'PENDING':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>1. Requested (Needs Review)</span>
          </span>
        );
      case 'APPROVED':
      case 'CONFIRMED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1.5 shadow-2xs">
            <FileText className="w-3.5 h-3.5" />
            <span>2. Approved &amp; Billed</span>
          </span>
        );
      case 'PAID':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1.5 shadow-2xs">
            <CreditCard className="w-3.5 h-3.5" />
            <span>3. Payment Verified</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
            <span>4. Dispatched / In Transit</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>5. Delivered &amp; Confirmed</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-teal-300">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  if (!isAdminUnlocked) {
    return <AdminPinLock onUnlock={() => setIsAdminUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-500/30 text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Navigation & Breadcrumb Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/admin/customers"
              className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to </span>
              <span>Customers</span>
            </Link>

            <span className="text-slate-300 hidden sm:inline">|</span>

            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="text-xs font-black text-slate-900 truncate">{user?.name || 'Customer Profile'}</span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold shrink-0">
                {customerId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadCustomerData}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Refresh Customer Record"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/admin"
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Single-Screen Customer Workspace Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-xs border border-slate-200 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-600">Loading complete customer record & order pipeline...</p>
          </div>
        ) : !user ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-xs border border-slate-200 space-y-4">
            <Search className="w-10 h-10 text-slate-300 mx-auto" />
            <h2 className="text-lg font-black text-slate-900">Customer Account Not Found</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No registered account matching ID <strong>{customerId}</strong> was found in the database.
            </p>
            <Link
              href="/admin?tab=users"
              className="inline-block px-5 py-2.5 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition-colors"
            >
              Return to Customer Directory
            </Link>
          </div>
        ) : (
          <>
            {/* 1. Full-Width Omnichannel Customer 360 Header Banner */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left: Avatar & Identity */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-800 to-emerald-600 text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {user.name}
                      </h1>
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {user.status}
                      </span>
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded font-bold">
                        {user.id}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-3 sm:gap-4 flex-wrap font-medium">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <strong>{user.mobile}</strong>
                      </span>
                      {user.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.email}</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">Member Since: {new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>

                    {user.address?.street && (
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400">Delivery Address:</span>
                        <strong className="text-slate-700">
                          {user.address.street}, {user.address.city || ''} {user.address.state || ''} - {user.address.pincode || ''}
                        </strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                  <button
                    onClick={() => setEditUserModalOpen(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Profile / Password</span>
                  </button>

                  <button
                    onClick={handleToggleStatus}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                      user.status === 'ACTIVE'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    {user.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                  </button>

                  <button
                    onClick={handleDeleteUser}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200 flex items-center gap-1.5"
                    title="Permanently Delete Customer Account"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>

              {/* Direct Omnichannel Contact Bar */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>1-Click Consultant Direct Connect:</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* WhatsApp Direct */}
                  <a
                    href={getWhatsAppContactUrl(
                      `Hello ${user.name}, this is your N-Square Store consultant regarding your authentic Amway orders and account (${user.id}). How may I assist you today?`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Phone Call */}
                  <a
                    href={`tel:${user.mobile}`}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-200 flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Call Customer</span>
                  </a>

                  {/* Email */}
                  {user.email && (
                    <a
                      href={`mailto:${user.email}?subject=N-Square%20Amway%20Store%20Update`}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-200 flex items-center gap-1"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Send Email</span>
                    </a>
                  )}

                  {/* Instagram */}
                  <a
                    href={SOCIAL_LINKS.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold transition-colors border border-pink-200 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span>Instagram</span>
                  </a>

                  {/* LinkedIn */}
                  <a
                    href={SOCIAL_LINKS.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors border border-blue-200 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                </div>
              </div>
            </div>

            {/* 2. Customer Summary Metric Cards (Full Width 4 Cols) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Consignments</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{userMetrics.ordersCount}</div>
                <div className="text-[11px] text-teal-700 font-semibold mt-0.5">
                  {userMetrics.deliveredCount} Delivered • {userMetrics.inTransitCount} In Transit
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lifetime Spend</div>
                <div className="text-2xl font-black text-emerald-800 mt-1">₹{userMetrics.totalSpent.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Verified Direct Selling Fulfillment</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Orders</div>
                <div className="text-2xl font-black text-amber-600 mt-1">{userMetrics.pendingOrdersCount}</div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  {userMetrics.pendingOrdersCount > 0 ? 'Action required in Orders tab' : 'All orders processed'}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Cart Items</div>
                <div className="text-2xl font-black text-indigo-700 mt-1">{userMetrics.cartCount}</div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  {userMetrics.cartCount > 0 ? 'Live synchronized from customer device' : 'Cart currently empty'}
                </div>
              </div>
            </div>

            {/* 3. Spacious Full-Width Tab Navigation */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-1.5 flex items-center gap-1.5 overflow-x-auto touch-scroll">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 min-w-[130px] sm:min-w-[160px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-gradient-to-r from-teal-800 to-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>Orders &amp; Bills</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 min-w-[130px] sm:min-w-[150px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-gradient-to-r from-teal-800 to-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Profile &amp; Address</span>
              </button>

              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 min-w-[130px] sm:min-w-[160px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-gradient-to-r from-teal-800 to-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>In-App Requests</span>
                {requests.length > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {requests.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('cart')}
                className={`flex-1 min-w-[130px] sm:min-w-[140px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'cart'
                    ? 'bg-gradient-to-r from-teal-800 to-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>Synced Cart</span>
                {userMetrics.cartCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === 'cart' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'
                    }`}
                  >
                    {userMetrics.cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* 4. Tab Content Area (Full Screen Width, Spacious & Comfortable) */}
            {/* ========================================================================= */}
            {/* TAB: ORDERS & INVOICING */}
            {/* ========================================================================= */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center shadow-xs border border-slate-200 space-y-3">
                    <Package className="w-12 h-12 mx-auto text-slate-300" />
                    <h3 className="text-base font-bold text-slate-800">No Orders on File</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      This customer has not placed any orders yet. When they checkout via WhatsApp or web portal, their order will appear here.
                    </p>
                    {user.cart && user.cart.length > 0 && (
                      <button
                        onClick={handleConvertCartToOrder}
                        className="px-5 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-600 text-white rounded-xl text-xs font-bold hover:shadow-md transition-all cursor-pointer"
                      >
                        Convert Active Shopping Cart ({user.cart.length} items) into Order
                      </button>
                    )}
                  </div>
                ) : (
                  orders.map((o) => {
                    const discount = o.discountAmount || 0;
                    const delivery = o.deliveryCharge || 0;
                    const finalPayable = o.finalPayableAmount ?? Math.max(0, o.totalAmount - discount + delivery);
                    const isEditingThis = editingPricingOrderId === o.id;

                    return (
                      <div
                        key={o.id}
                        className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5 transition-all"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-base sm:text-lg font-black font-mono text-slate-900">{o.id}</span>
                            {renderOrderStatusBadge(o.status)}
                            <span className="text-xs text-slate-400">
                              Placed on: {new Date(o.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedInvoiceOrder(o)}
                              className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-extrabold transition-colors border border-teal-200 flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Official Bill / Invoice</span>
                            </button>

                            <button
                              onClick={() => handleDeleteOrder(o.id)}
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center text-xs transition-colors cursor-pointer"
                              title="Delete Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Order Items Table (Comfortable Full Width) */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                                <th className="pb-2">Product Item</th>
                                <th className="pb-2 text-center">Pack / Variant</th>
                                <th className="pb-2 text-center">Qty</th>
                                <th className="pb-2 text-right">Price</th>
                                <th className="pb-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {o.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-2.5">
                                    <div className="flex items-center gap-3">
                                      {item.image && (
                                        <img
                                          src={item.image}
                                          alt={item.name}
                                          className="w-9 h-9 object-contain rounded-lg border border-slate-100 p-0.5 shrink-0"
                                        />
                                      )}
                                      <div>
                                        <div className="font-bold text-slate-900">{item.name}</div>
                                        {item.sku && <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 text-center text-slate-600 font-medium">{item.variant || 'Standard'}</td>
                                  <td className="py-2.5 text-center font-bold text-slate-900">{item.qty}</td>
                                  <td className="py-2.5 text-right font-medium text-slate-600">₹{item.price.toLocaleString('en-IN')}</td>
                                  <td className="py-2.5 text-right font-bold text-slate-900">
                                    ₹{((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Financial Breakdown & Invoicing Controls */}
                        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 text-xs text-slate-600">
                              <span>Catalog Subtotal: <strong>₹{o.totalAmount.toLocaleString('en-IN')}</strong></span>
                              {discount > 0 && <span className="text-emerald-700">Special Discount: <strong>-₹{discount}</strong> {o.discountNote && `(${o.discountNote})`}</span>}
                              {delivery > 0 && <span className="text-blue-700">Fulfillment Fee: <strong>+₹{delivery}</strong></span>}
                            </div>
                            <div className="text-base font-black text-slate-900 flex items-center gap-2">
                              <span>Final Total Payable:</span>
                              <span className="text-xl text-teal-900">₹{finalPayable.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* Quick Adjust Pricing Button */}
                          <div className="flex items-center gap-2">
                            {isEditingThis ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="number"
                                  placeholder="Discount ₹"
                                  value={discountInput}
                                  onChange={(e) => setDiscountInput(e.target.value)}
                                  className="w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                                />
                                <input
                                  type="number"
                                  placeholder="Delivery ₹"
                                  value={deliveryChargeInput}
                                  onChange={(e) => setDeliveryChargeInput(e.target.value)}
                                  className="w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                                />
                                <button
                                  onClick={() => handleApproveOrder(o)}
                                  disabled={isSubmitting}
                                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Save &amp; Bill
                                </button>
                                <button
                                  onClick={() => setEditingPricingOrderId(null)}
                                  className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPricingOrderId(o.id);
                                  setDiscountInput(String(o.discountAmount || ''));
                                  setDiscountNoteInput(o.discountNote || '');
                                  setDeliveryChargeInput(String(o.deliveryCharge || ''));
                                  setDeliveryNoteInput(o.deliveryChargeNote || '');
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                ⚙️ Adjust Pricing &amp; Fees
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Order Workflow Stages (Approve -> Record Payment -> Dispatch Courier -> Confirm Delivered) */}
                        <div className="pt-2 flex flex-wrap items-center gap-2.5">
                          {/* Stage 1: Approve Order */}
                          {(o.status === 'REQUESTED' || o.status === 'PENDING') && (
                            <>
                              <button
                                onClick={() => handleApproveOrder(o)}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>✓</span>
                                <span>Approve &amp; Generate Invoice</span>
                              </button>

                              <button
                                onClick={() => handleDeclineOrder(o)}
                                disabled={isSubmitting}
                                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200 cursor-pointer"
                              >
                                Decline Request
                              </button>
                            </>
                          )}

                          {/* Stage 2: Record Payment */}
                          {o.status === 'APPROVED' && o.paymentStatus !== 'PAID' && (
                            <button
                              onClick={() => {
                                setPaymentOrderId(o.id);
                                setPaymentRefInput(`UTR-${Date.now().toString().slice(-6)}`);
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Record Customer Payment</span>
                            </button>
                          )}

                          {/* Stage 3: Dispatch Courier */}
                          {(o.status === 'APPROVED' || o.status === 'PAID') && (
                            <button
                              onClick={() => {
                                setDispatchOrderId(o.id);
                                setTrackingNumInput(o.trackingNumber || `BLD-${Math.floor(100000000 + Math.random() * 900000000)}`);
                              }}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Dispatch Courier &amp; AWB</span>
                            </button>
                          )}

                          {/* Stage 4: Mark Delivered */}
                          {o.status === 'DISPATCHED' && (
                            <button
                              onClick={() => handleConfirmDelivered(o)}
                              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Confirm Delivered</span>
                            </button>
                          )}

                          {/* Live Courier Tracking Link */}
                          {o.trackingNumber && (
                            <a
                              href={o.trackingUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-200 flex items-center gap-1.5 ml-auto"
                            >
                              <MapPin className="w-3.5 h-3.5 text-teal-700" />
                              <span>Track AWB:</span>
                              <span className="font-mono">{o.trackingNumber}</span>
                              <span>({o.courierName || 'Courier'})</span>
                              <span>↗</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: MASTER PROFILE & KYC */}
            {/* ========================================================================= */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Account Details */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-700" />
                    <span>Account Credentials &amp; KYC</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Customer Full Name:</span>
                      <span className="font-bold text-slate-900">{user.name}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Primary Mobile (Login ID):</span>
                      <span className="font-mono font-bold text-slate-900">{user.mobile}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Email Address:</span>
                      <span className="font-medium text-slate-900">{user.email || 'Not provided'}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Customer Password:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {user.password}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(user.password);
                            showToast('Password copied to clipboard!');
                          }}
                          className="text-[10px] text-teal-700 hover:underline font-bold cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Account Status:</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {user.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Account ID:</span>
                      <span className="font-mono text-slate-600">{user.id}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Last Login:</span>
                      <span className="text-slate-700">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-IN') : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shipping Address & Consultant Notes */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-700" />
                    <span>Default Shipping Address &amp; Notes</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-800">Primary Delivery Destination</div>
                      <div className="text-slate-600 leading-relaxed">
                        {user.address?.street ? (
                          <>
                            <p>{user.address.street}</p>
                            <p>{user.address.city}, {user.address.state} - {user.address.pincode}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No delivery address saved yet. Customer can submit address from their portal.</span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <div className="font-bold text-slate-800">Consultant Notes &amp; Verification</div>
                      <p className="text-slate-600 leading-relaxed italic">
                        {user.notes || 'No custom consultant notes on file.'}
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setEditUserModalOpen(true)}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Edit Profile Details &amp; Address
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: IN-APP REQUESTS */}
            {/* ========================================================================= */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center shadow-xs border border-slate-200 space-y-2">
                    <Bell className="w-10 h-10 mx-auto text-slate-300" />
                    <h3 className="text-base font-bold text-slate-800">No Support or Profile Requests</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Any address updates, password change inquiries, or questions submitted by {user.name} will be presented here for immediate approval.
                    </p>
                  </div>
                ) : (
                  requests.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-900">{r.id}</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              r.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-900'
                                : r.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-900 animate-pulse'
                            }`}
                          >
                            {r.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            Submitted: {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="font-bold text-slate-800 mb-1">Customer Message:</div>
                        <p>{r.message}</p>
                      </div>

                      {r.adminNotes && (
                        <div className="text-xs text-teal-900 bg-teal-50 p-3 rounded-xl border border-teal-200 font-medium">
                          <strong>Admin Resolution Note:</strong> {r.adminNotes}
                        </div>
                      )}

                      {r.status === 'OPEN' && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <input
                            type="text"
                            placeholder="Optional resolution note for customer..."
                            value={resolutionNotes[r.id] || ''}
                            onChange={(e) => setResolutionNotes({ ...resolutionNotes, [r.id]: e.target.value })}
                            className="flex-1 min-w-[200px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                          <button
                            onClick={() => handleResolveRequest(r.id, 'RESOLVED')}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            ✓ Approve &amp; Resolve
                          </button>
                          <button
                            onClick={() => handleResolveRequest(r.id, 'REJECTED')}
                            disabled={isSubmitting}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: LIVE SYNCED SHOPPING CART */}
            {/* ========================================================================= */}
            {activeTab === 'cart' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
                <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-teal-700" />
                      <span>Live Synced Shopping Cart</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Items currently saved in {user.name}&apos;s cart across web &amp; mobile browsers.
                    </p>
                  </div>

                  {user.cart && user.cart.length > 0 && (
                    <button
                      onClick={handleConvertCartToOrder}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Convert Cart into Confirmed Order</span>
                    </button>
                  )}
                </div>

                {!user.cart || user.cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Customer&apos;s shopping cart is currently empty.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="divide-y divide-slate-100">
                      {user.cart.map((c, i) => (
                        <div key={i} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {c.image && (
                              <img src={c.image} alt={c.name} className="w-10 h-10 object-contain rounded-lg p-0.5 border border-slate-100" />
                            )}
                            <div>
                              <div className="text-xs font-bold text-slate-900">{c.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {c.variant || 'Standard'} • Qty: {c.qty || 1}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-900">
                              ₹{((c.price || 0) * (c.qty || 1)).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-slate-400">₹{c.price} each</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between font-black text-sm text-slate-900">
                      <span>Total Cart Value:</span>
                      <span className="text-emerald-800 text-base">
                        ₹{user.cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Invoice Modal for Official Printable Bill */}
      {selectedInvoiceOrder && (
        <InvoiceModal order={selectedInvoiceOrder} onClose={() => setSelectedInvoiceOrder(null)} />
      )}

      {/* Edit Customer Profile Modal */}
      {editUserModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeInOverlay overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Edit Customer Profile &amp; Password</h3>
              <button
                onClick={() => setEditUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mobile (Login Key) *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Password *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-teal-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Street Address</label>
                <input
                  type="text"
                  value={editFormData.street}
                  onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Door / Flat / Street / Landmark"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City</label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">State</label>
                  <input
                    type="text"
                    value={editFormData.state}
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Pincode</label>
                  <input
                    type="text"
                    value={editFormData.pincode}
                    onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Consultant Notes</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Verification details, KYC, preferences..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

