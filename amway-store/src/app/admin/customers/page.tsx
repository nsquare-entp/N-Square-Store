'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Edit2,
  Lock,
  Unlock,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Package,
  ShoppingCart,
  AlertCircle,
  Plus,
  Search,
  RefreshCw,
  UserCheck,
  IndianRupee,
  AlertTriangle,
  UserPlus,
  Zap,
  Users,
  User,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { UserAccount, CustomerOrder, AccountUpdateRequest } from '../../../types/user';
import { SOCIAL_LINKS, getWhatsAppContactUrl } from '../../../config/social';
import InvoiceModal from '../../../components/admin/InvoiceModal';
import AdminPinLock from '../../../components/admin/AdminPinLock';
import { adminFetch } from '../../../utils/adminFetch';

export const dynamic = 'force-dynamic';

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  mrp: number;
  weight?: string;
  image?: string;
  inStock?: boolean;
}

export default function AdminCustomersPage() {
  const router = useRouter();

  // Auth & Admin Lock State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Core Data State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [accountRequests, setAccountRequests] = useState<AccountUpdateRequest[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<'ALL' | 'NEEDS_ACTION' | 'ACTIVE' | 'VIP' | 'SUSPENDED'>('ALL');

  // Customer 360 Drawer / Inspector State
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'orders' | 'cart' | 'requests' | 'profile'>('orders');

  // Create / Edit User Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userFormData, setUserFormData] = useState({
    id: '',
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

  // Add / Edit Order Modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderTargetUser, setOrderTargetUser] = useState<UserAccount | null>(null);
  const [orderItems, setOrderItems] = useState<Array<{ id: string; name: string; price: number; qty: number; variant?: string; image?: string }>>([]);
  const [orderDiscount, setOrderDiscount] = useState('0');
  const [orderDiscountNote, setOrderDiscountNote] = useState('');
  const [orderDelivery, setOrderDelivery] = useState('0');
  const [orderDeliveryNote, setOrderDeliveryNote] = useState('');
  const [orderStatus, setOrderStatus] = useState<'CONFIRMED' | 'REQUESTED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'>('CONFIRMED');
  const [orderPaymentStatus, setOrderPaymentStatus] = useState<'PAID' | 'COD' | 'PENDING'>('PAID');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'UPI' | 'NET_BANKING' | 'CARD' | 'COD' | 'CASH'>('UPI');
  const [orderNotesInput, setOrderNotesInput] = useState('');

  // Invoice Modal
  const [invoiceOrder, setInvoiceOrder] = useState<CustomerOrder | null>(null);

  // In-line Order Pricing Editor
  const [pricingOrderId, setPricingOrderId] = useState<string | null>(null);
  const [pricingDiscount, setPricingDiscount] = useState('');
  const [pricingDiscountNote, setPricingDiscountNote] = useState('');
  const [pricingDelivery, setPricingDelivery] = useState('');
  const [pricingDeliveryNote, setPricingDeliveryNote] = useState('');

  // In-line Payment Recording
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentMethodInput, setPaymentMethodInput] = useState<'UPI' | 'NET_BANKING' | 'CARD' | 'COD' | 'CASH'>('UPI');
  const [paymentRefInput, setPaymentRefInput] = useState('');

  // In-line Dispatch Courier
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [courierInput, setCourierInput] = useState('Blue Dart Express');
  const [trackingNumInput, setTrackingNumInput] = useState('');
  const [trackingUrlInput, setTrackingUrlInput] = useState('');

  // Request Resolution Notes
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Verify Admin Session Token on Mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('nsquare_admin_token') : null;
    if (token) {
      fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
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

  // 2. Fetch Data when Admin is Unlocked
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, ordersRes, reqsRes, prodsRes] = await Promise.all([
        adminFetch('/api/users'),
        adminFetch('/api/orders'),
        adminFetch('/api/account-requests'),
        fetch('/api/products'),
      ]);

      const usersData = await usersRes.json();
      const ordersData = await ordersRes.json();
      const reqsData = await reqsRes.json();
      const prodsData = await prodsRes.json();

      if (usersData.users) setUsers(usersData.users);
      if (ordersData.orders) setOrders(ordersData.orders);
      if (reqsData.requests) setAccountRequests(reqsData.requests);
      if (prodsData.products) setProducts(prodsData.products);

      // Keep selectedUser in sync if open
      if (selectedUser && usersData.users) {
        const refreshed = usersData.users.find((u: UserAccount) => u.id === selectedUser.id);
        if (refreshed) setSelectedUser(refreshed);
      }
    } catch (err) {
      console.error('Failed to load customers data:', err);
      showToast('⚠️ Error loading customer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminUnlocked) {
      loadAllData();
    }
  }, [isAdminUnlocked]);

  // Compute Metrics per User
  const ordersByUser = useMemo(() => {
    const map: Record<string, CustomerOrder[]> = {};
    orders.forEach((o) => {
      if (!map[o.userId]) map[o.userId] = [];
      map[o.userId].push(o);
    });
    return map;
  }, [orders]);

  const requestsByUser = useMemo(() => {
    const map: Record<string, AccountUpdateRequest[]> = {};
    accountRequests.forEach((r) => {
      if (!map[r.userId]) map[r.userId] = [];
      map[r.userId].push(r);
    });
    return map;
  }, [accountRequests]);

  const userMetrics = useMemo(() => {
    const metrics: Record<
      string,
      {
        totalSpent: number;
        ordersCount: number;
        deliveredCount: number;
        hasPendingOrder: boolean;
        hasOpenRequest: boolean;
        cartCount: number;
      }
    > = {};

    users.forEach((u) => {
      const uOrders = ordersByUser[u.id] || [];
      const uReqs = requestsByUser[u.id] || [];
      const totalSpent = uOrders.reduce((acc, o) => {
        const discount = o.discountAmount || 0;
        const delivery = o.deliveryCharge || 0;
        return acc + (o.finalPayableAmount ?? Math.max(0, o.totalAmount - discount + delivery));
      }, 0);
      const deliveredCount = uOrders.filter((o) => o.status === 'DELIVERED').length;
      const hasPendingOrder = uOrders.some((o) => o.status === 'REQUESTED' || o.status === 'PENDING');
      const hasOpenRequest = uReqs.some((r) => r.status === 'OPEN');
      const cartCount = u.cart ? u.cart.reduce((sum, c) => sum + (c.qty || 1), 0) : 0;

      metrics[u.id] = {
        totalSpent,
        ordersCount: uOrders.length,
        deliveredCount,
        hasPendingOrder,
        hasOpenRequest,
        cartCount,
      };
    });
    return metrics;
  }, [users, ordersByUser, requestsByUser]);

  // High-Level Directory Metrics
  const totalLifetimeRevenue = useMemo(() => {
    return Object.values(userMetrics).reduce((sum, m) => sum + m.totalSpent, 0);
  }, [userMetrics]);

  const needsActionCount = useMemo(() => {
    return Object.values(userMetrics).filter((m) => m.hasPendingOrder || m.hasOpenRequest).length;
  }, [userMetrics]);

  const activeCartsCount = useMemo(() => {
    return users.filter((u) => u.cart && u.cart.length > 0).length;
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    let list = users;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((u) => {
        const nameMatch = u.name.toLowerCase().includes(q);
        const mobileMatch = u.mobile.includes(q);
        const emailMatch = u.email ? u.email.toLowerCase().includes(q) : false;
        const cityMatch = u.address?.city ? u.address.city.toLowerCase().includes(q) : false;
        const idMatch = u.id.toLowerCase().includes(q);
        return nameMatch || mobileMatch || emailMatch || cityMatch || idMatch;
      });
    }

    if (filterTag === 'NEEDS_ACTION') {
      list = list.filter((u) => userMetrics[u.id]?.hasPendingOrder || userMetrics[u.id]?.hasOpenRequest);
    } else if (filterTag === 'ACTIVE') {
      list = list.filter((u) => u.status === 'ACTIVE');
    } else if (filterTag === 'VIP') {
      list = list.filter((u) => (userMetrics[u.id]?.totalSpent || 0) >= 5000);
    } else if (filterTag === 'SUSPENDED') {
      list = list.filter((u) => u.status === 'SUSPENDED');
    }

    return list;
  }, [users, searchQuery, filterTag, userMetrics]);

  // Handler: Open Create Customer Modal
  const handleOpenCreateUser = () => {
    setIsEditingUser(false);
    setUserFormData({
      id: '',
      name: '',
      mobile: '',
      email: '',
      password: '',
      street: '',
      city: '',
      state: '',
      pincode: '',
      notes: '',
      status: 'ACTIVE',
    });
    setUserModalOpen(true);
  };

  // Handler: Open Edit Customer Modal
  const handleOpenEditUser = (u: UserAccount) => {
    setIsEditingUser(true);
    setUserFormData({
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      email: u.email || '',
      password: u.password || '',
      street: u.address?.street || '',
      city: u.address?.city || '',
      state: u.address?.state || '',
      pincode: u.address?.pincode || '',
      notes: u.notes || '',
      status: u.status,
    });
    setUserModalOpen(true);
  };

  // Handler: Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name.trim() || !userFormData.mobile.trim()) {
      alert('Customer Name and Mobile are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: userFormData.name.trim(),
        mobile: userFormData.mobile.trim(),
        email: userFormData.email.trim() || undefined,
        status: userFormData.status,
        notes: userFormData.notes.trim() || undefined,
        address: {
          street: userFormData.street.trim() || undefined,
          city: userFormData.city.trim() || undefined,
          state: userFormData.state.trim() || undefined,
          pincode: userFormData.pincode.trim() || undefined,
        },
      };

      if (userFormData.password.trim()) {
        payload.password = userFormData.password.trim();
      }

      if (isEditingUser && userFormData.id) {
        payload.id = userFormData.id;
      }

      const res = await adminFetch('/api/users', {
        method: isEditingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to save customer account');
        return;
      }

      showToast(isEditingUser ? 'Customer profile updated successfully.' : `New Customer Created: ${data.user.id}`);
      setUserModalOpen(false);
      loadAllData();
      if (selectedUser && selectedUser.id === data.user.id) {
        setSelectedUser(data.user);
      }
    } catch (err) {
      alert('Network error while saving customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Toggle User Status
  const handleToggleUserStatus = async (targetUser: UserAccount) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await adminFetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetUser.id, status: nextStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Customer ${targetUser.name} is now ${nextStatus}.`);
        loadAllData();
        if (selectedUser?.id === targetUser.id) {
          setSelectedUser(data.user);
        }
      } else {
        alert(data.error || 'Failed to toggle status');
      }
    } catch (err) {
      alert('Network error while updating status');
    }
  };

  // Handler: Delete User
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete customer account "${userName}" (${userId})? This will not delete their historical orders.`)) {
      return;
    }

    try {
      const res = await adminFetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Customer account permanently deleted.');
        if (selectedUser?.id === userId) setSelectedUser(null);
        loadAllData();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Network error while deleting user');
    }
  };

  // Handler: Open Add Order Modal for Customer
  const handleOpenAddOrder = (u: UserAccount, fromCart: boolean = false) => {
    setOrderTargetUser(u);
    const initialItems = fromCart && u.cart && u.cart.length > 0
      ? u.cart.map((c) => ({
          id: c.id,
          name: c.name,
          price: c.price,
          qty: c.qty,
          variant: c.variant,
          image: c.image || undefined,
        }))
      : [];

    setOrderItems(initialItems);
    setOrderDiscount('0');
    setOrderDiscountNote('');
    setOrderDelivery('0');
    setOrderDeliveryNote('');
    setOrderStatus('CONFIRMED');
    setOrderPaymentStatus('PAID');
    setOrderPaymentMethod('UPI');
    setOrderNotesInput(fromCart ? 'Converted directly from customer active cart.' : 'Manual admin consignment order.');
    setOrderModalOpen(true);
  };

  // Handler: Save New Order
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderTargetUser || orderItems.length === 0) {
      alert('Please add at least one product to the order.');
      return;
    }

    setIsSubmitting(true);
    try {
      const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
      const discountNum = parseFloat(orderDiscount) || 0;
      const deliveryNum = parseFloat(orderDelivery) || 0;
      const finalPayable = Math.max(0, subtotal - discountNum + deliveryNum);

      const formattedAddress = orderTargetUser.address?.street
        ? `${orderTargetUser.address.street}, ${orderTargetUser.address.city || ''}, ${orderTargetUser.address.state || ''} - ${orderTargetUser.address.pincode || ''}`
        : 'Registered customer address';

      const payload = {
        userId: orderTargetUser.id,
        userName: orderTargetUser.name,
        userMobile: orderTargetUser.mobile,
        userEmail: orderTargetUser.email || undefined,
        shippingAddress: formattedAddress,
        items: orderItems,
        totalAmount: subtotal,
        totalMrp: Math.round(subtotal * 1.15),
        savings: Math.round(subtotal * 0.15),
        discountAmount: discountNum,
        discountNote: orderDiscountNote.trim() || undefined,
        deliveryCharge: deliveryNum,
        deliveryChargeNote: orderDeliveryNote.trim() || undefined,
        finalPayableAmount: finalPayable,
        status: orderStatus,
        paymentStatus: orderPaymentStatus,
        paymentMethod: orderPaymentMethod,
        orderNotes: orderNotesInput.trim() || undefined,
      };

      const res = await adminFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to create order');
        return;
      }

      showToast(`Consignment ${data.order.id} registered successfully.`);
      setOrderModalOpen(false);
      loadAllData();
    } catch (err) {
      alert('Network error while creating order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Save In-Line Pricing Changes
  const handleSavePricing = async (orderId: string) => {
    try {
      const discountNum = parseFloat(pricingDiscount) || 0;
      const deliveryNum = parseFloat(pricingDelivery) || 0;
      const targetOrder = orders.find((o) => o.id === orderId);
      if (!targetOrder) return;

      const finalPayable = Math.max(0, targetOrder.totalAmount - discountNum + deliveryNum);

      const res = await adminFetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          discountAmount: discountNum,
          discountNote: pricingDiscountNote.trim() || undefined,
          deliveryCharge: deliveryNum,
          deliveryChargeNote: pricingDeliveryNote.trim() || undefined,
          finalPayableAmount: finalPayable,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Order pricing & bill adjustments saved.');
        setPricingOrderId(null);
        loadAllData();
      } else {
        alert(data.error || 'Failed to update pricing');
      }
    } catch (err) {
      alert('Network error while updating pricing');
    }
  };

  // Handler: Record Payment
  const handleRecordPayment = async (orderId: string) => {
    try {
      const res = await adminFetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          paymentStatus: 'PAID',
          paymentMethod: paymentMethodInput,
          paymentRefNumber: paymentRefInput.trim() || `UTR-${Date.now().toString().slice(-6)}`,
          paidAt: new Date().toISOString(),
          status: 'CONFIRMED',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Payment verified and recorded.');
        setPaymentOrderId(null);
        setPaymentRefInput('');
        loadAllData();
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (err) {
      alert('Network error while recording payment');
    }
  };

  // Handler: Update Courier Dispatch Tracking
  const handleUpdateDispatch = async (orderId: string) => {
    if (!trackingNumInput.trim()) {
      alert('Please enter a tracking/consignment number.');
      return;
    }

    try {
      const res = await adminFetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          status: 'DISPATCHED',
          courierName: courierInput,
          trackingNumber: trackingNumInput.trim(),
          trackingUrl: trackingUrlInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Courier dispatch details updated & marked DISPATCHED.');
        setDispatchOrderId(null);
        loadAllData();
      } else {
        alert(data.error || 'Failed to update courier tracking');
      }
    } catch (err) {
      alert('Network error while updating courier tracking');
    }
  };

  // Handler: Mark Order Delivered
  const handleMarkDelivered = async (orderId: string) => {
    if (!confirm('Mark this consignment as DELIVERED to the customer?')) return;
    try {
      const res = await adminFetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          status: 'DELIVERED',
          deliveredAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Order marked DELIVERED.');
        loadAllData();
      } else {
        alert(data.error || 'Failed to mark delivered');
      }
    } catch (err) {
      alert('Network error while updating order');
    }
  };

  // Handler: Resolve Account Request
  const handleResolveRequest = async (req: AccountUpdateRequest, action: 'RESOLVED' | 'REJECTED') => {
    const notes = resolutionNotes[req.id] || '';
    setIsSubmitting(true);
    try {
      const res = await adminFetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: req.id,
          status: action,
          adminNotes: notes.trim() || `Processed by admin consultant.`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // If address change was approved, auto-update the user profile address
        if (action === 'RESOLVED' && req.requestType === 'ADDRESS_CHANGE' && req.requestedData?.address) {
          await adminFetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: req.userId,
              address: req.requestedData.address,
            }),
          });
        }

        showToast(`Request ${req.id} marked ${action}.`);
        loadAllData();
      } else {
        alert(data.error || 'Failed to resolve request');
      }
    } catch (err) {
      alert('Network error while resolving request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guard: PIN Protection
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-800 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-600">Verifying Admin Access Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAdminUnlocked) {
    return <AdminPinLock onUnlock={() => setIsAdminUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-20">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-teal-500/40 text-xs sm:text-sm font-bold flex items-center gap-3 animate-slideUp">
          <span className="text-base text-teal-400">✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Back Link & Title */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
              title="Return to Main Admin Dashboard"
            >
              <span>←</span>
              <span className="hidden sm:inline">Admin Dashboard</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-700" />
                <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
                  Customer Management Studio
                </h1>
                <span className="hidden md:inline-flex text-[10px] bg-teal-100 text-teal-900 font-extrabold px-2 py-0.5 rounded-full border border-teal-300">
                  Full-Screen Workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                Manage all registered customer accounts, profiles, orders, and support requests in one screen.
              </p>
            </div>
          </div>

          {/* Right: Quick Links & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/validation"
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold transition-colors hidden lg:flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Validations</span>
            </Link>

            <Link
              href="/products"
              target="_blank"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors hidden md:flex items-center gap-1.5 border border-slate-200"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
              <span>Storefront ↗</span>
            </Link>

            <button
              onClick={loadAllData}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              title="Refresh All Customer Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleOpenCreateUser}
              className="px-3.5 py-1.5 bg-gradient-to-r from-teal-800 to-emerald-700 hover:from-teal-900 hover:to-emerald-800 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>New Customer</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Total Accounts
              </span>
              <Users className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {users.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-teal-700 font-semibold mt-0.5">
              {users.filter((u) => u.status === 'ACTIVE').length} Active • {users.filter((u) => u.status === 'SUSPENDED').length} Suspended
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Direct Store Revenue
              </span>
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
              ₹{totalLifetimeRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5">
              Across {orders.length} consignments
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Action Needed
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
              {needsActionCount}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5">
              Pending orders &amp; support tickets
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Active Shoppers
              </span>
              <ShoppingCart className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-700 mt-1">
              {activeCartsCount}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5">
              Customers browsing with items in cart
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer name, phone number, city, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-teal-600 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 w-5 h-5 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterTag('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filterTag === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Accounts ({users.length})
            </button>

            <button
              onClick={() => setFilterTag('NEEDS_ACTION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTag === 'NEEDS_ACTION'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-800 shrink-0" />
              <span>Needs Action ({needsActionCount})</span>
            </button>

            <button
              onClick={() => setFilterTag('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filterTag === 'ACTIVE'
                  ? 'bg-teal-800 text-white shadow-2xs'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              Active ({users.filter((u) => u.status === 'ACTIVE').length})
            </button>

            <button
              onClick={() => setFilterTag('VIP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filterTag === 'VIP'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              VIP (₹5K+) ({users.filter((u) => (userMetrics[u.id]?.totalSpent || 0) >= 5000).length})
            </button>

            <button
              onClick={() => setFilterTag('SUSPENDED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filterTag === 'SUSPENDED'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Suspended ({users.filter((u) => u.status === 'SUSPENDED').length})
            </button>
          </div>
        </div>

        {/* Customer Directory Cards Grid */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-3">
            <div className="w-10 h-10 border-4 border-teal-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-600">Loading verified customer directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-xs border border-slate-200 space-y-3">
            <Search className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Customers Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No customer records match your current filter or search criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterTag('ALL');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredUsers.map((u) => {
              const m = userMetrics[u.id];

              return (
                <div
                  key={u.id}
                  onClick={() => {
                    router.push(`/admin/customers/${u.id}`);
                  }}
                  className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-500/60 transition-all cursor-pointer flex flex-col justify-between space-y-3.5 relative"
                >
                  {/* Top Row: Avatar & Customer Header */}
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-teal-800 to-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-teal-800 transition-colors">
                            {u.name}
                          </h3>
                        </div>
                        <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center gap-1 min-[380px]:gap-2 text-[10px] sm:text-[11px] text-slate-500 font-mono">
                          <span className="flex items-center gap-1 shrink-0 font-medium">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{u.mobile}</span>
                          </span>
                          <span className="text-slate-300 hidden min-[380px]:inline">•</span>
                          <span className="text-slate-500 font-mono text-[9px] sm:text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 w-fit shrink-0 select-all" title={u.id}>
                            {u.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle Info: Location & Badges */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-600">
                      {u.address?.city ? (
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{u.address.city}{u.address.state ? `, ${u.address.state}` : ''}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No address on file</span>
                      )}

                      {u.email && (
                        <span className="text-[11px] text-slate-500 truncate max-w-[170px] flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </span>
                      )}
                    </div>

                    {/* Financial & Order Metric Banner */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{m?.ordersCount || 0} orders ({m?.deliveredCount || 0} delivered)</span>
                      </span>
                      <span className="text-emerald-800 font-black">
                        ₹{(m?.totalSpent || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Alert Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5 min-h-[22px]">
                      {m?.hasPendingOrder && (
                        <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-md shadow-2xs animate-pulse flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Order Requested</span>
                        </span>
                      )}

                      {m?.hasOpenRequest && (
                        <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span>1 Support Request</span>
                        </span>
                      )}

                      {m && m.cartCount > 0 && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3 shrink-0" />
                          <span>{m.cartCount} in cart</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* WhatsApp Shortcut */}
                      <a
                        href={getWhatsAppContactUrl(
                          `Hello ${u.name}, this is your N-Square Store consultant regarding your account (${u.id}). How may I help you today?`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-colors border border-emerald-200 flex items-center justify-center shrink-0"
                        title="Open WhatsApp chat with customer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>

                      {/* Quick Edit */}
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200 cursor-pointer flex items-center justify-center shrink-0"
                        title="Edit Customer Profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Quick Status Toggle */}
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`p-2 rounded-xl transition-colors border cursor-pointer flex items-center justify-center shrink-0 ${
                          u.status === 'ACTIVE'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                        }`}
                        title={u.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                      >
                        {u.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Quick Delete */}
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors border border-rose-200 cursor-pointer flex items-center justify-center shrink-0"
                        title="Delete Customer Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Manage Customer CTA -> Navigates to full-screen Customer Management page */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/customers/${u.id}`);
                      }}
                      className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-teal-800 to-emerald-700 hover:from-teal-900 hover:to-emerald-800 text-white rounded-xl text-xs font-black transition-all shadow-2xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                    >
                      <span>Manage 360°</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. CUSTOMER 360 DRAWER / INSPECTOR MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto touch-scroll flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeInOverlay">
          <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-drawerSlideIn">
            {/* Inspector Top Bar */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg font-black shrink-0">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-base sm:text-lg truncate">
                      {selectedUser.name}
                    </h2>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        selectedUser.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                      }`}
                    >
                      {selectedUser.status}
                    </span>
                  </div>
                  <div className="text-xs text-teal-200 flex items-center gap-2 truncate mt-0.5">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" /><span>{selectedUser.mobile}</span></span>
                    <span>•</span>
                    <span className="font-mono">{selectedUser.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getWhatsAppContactUrl(
                    `Hello ${selectedUser.name}, this is your N-Square Store consultant regarding your account (${selectedUser.id}). How may I help you today?`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>

                <button
                  onClick={() => handleOpenEditUser(selectedUser)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </button>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors cursor-pointer"
                  title="Close Workspace"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2 flex items-center gap-1.5 overflow-x-auto touch-scroll no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setInspectorTab('orders')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  inspectorTab === 'orders'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-teal-700" />
                <span>Orders &amp; Consignments</span>
                <span className="bg-teal-100 text-teal-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {(ordersByUser[selectedUser.id] || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('cart')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  inspectorTab === 'cart'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                <span>Shopping Cart</span>
                {selectedUser.cart && selectedUser.cart.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                    {selectedUser.cart.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('requests')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  inspectorTab === 'requests'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                <span>Support Requests</span>
                {(requestsByUser[selectedUser.id] || []).filter((r) => r.status === 'OPEN').length > 0 && (
                  <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                    {(requestsByUser[selectedUser.id] || []).filter((r) => r.status === 'OPEN').length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('profile')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  inspectorTab === 'profile'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>Master Profile &amp; Address</span>
              </button>
            </div>

            {/* Sub-Tab Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: ORDERS & CONSIGNMENTS */}
              {inspectorTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
                      Consignments for {selectedUser.name}
                    </h3>

                    <button
                      onClick={() => handleOpenAddOrder(selectedUser, false)}
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>+</span>
                      <span>Add Consignment Order</span>
                    </button>
                  </div>

                  {(!ordersByUser[selectedUser.id] || ordersByUser[selectedUser.id].length === 0) ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs space-y-2">
                      <Package className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-600">No Orders Registered Yet</p>
                      <p className="text-slate-400">
                        Create a manual consignment order or wait for the customer to request checkout from their cart.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ordersByUser[selectedUser.id].map((order) => {
                        const discount = order.discountAmount || 0;
                        const delivery = order.deliveryCharge || 0;
                        const finalPayable = order.finalPayableAmount ?? Math.max(0, order.totalAmount - discount + delivery);

                        return (
                          <div
                            key={order.id}
                            className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3.5"
                          >
                            {/* Order Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-sm text-slate-900">
                                  {order.id}
                                </span>
                                <span
                                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                    order.status === 'DELIVERED'
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : order.status === 'DISPATCHED'
                                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                      : order.status === 'CONFIRMED'
                                      ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                      : order.status === 'REQUESTED'
                                      ? 'bg-amber-300 text-slate-950 font-black animate-pulse'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {order.status}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    order.paymentStatus === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                                  }`}
                                >
                                  💳 {order.paymentStatus}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                <button
                                  onClick={() => setInvoiceOrder(order)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span>📄</span>
                                  <span>Invoice</span>
                                </button>
                              </div>
                            </div>

                            {/* Items List */}
                            <div className="space-y-1.5">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-semibold text-slate-800 truncate">
                                      {item.name}
                                    </span>
                                    {item.variant && (
                                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                        {item.variant}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0 font-medium text-slate-600">
                                    {item.qty} × ₹{item.price} = <span className="font-bold text-slate-900">₹{item.qty * item.price}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Financial Summary */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200/90 text-xs space-y-1.5">
                              <div className="flex justify-between text-slate-500">
                                <span>Subtotal:</span>
                                <span>₹{order.totalAmount.toLocaleString('en-IN')}</span>
                              </div>
                              {discount > 0 && (
                                <div className="flex justify-between text-emerald-700 font-semibold">
                                  <span>Admin Discount ({order.discountNote || 'Custom'}):</span>
                                  <span>-₹{discount.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {delivery > 0 && (
                                <div className="flex justify-between text-amber-800 font-semibold">
                                  <span>Delivery Fee ({order.deliveryChargeNote || 'Standard'}):</span>
                                  <span>+₹{delivery.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-black text-slate-900 text-sm pt-1 border-t border-slate-100">
                                <span>Final Payable:</span>
                                <span className="text-emerald-800 font-black">₹{finalPayable.toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            {/* In-Line Action Bars */}
                            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                              {/* Edit Pricing Button */}
                              <button
                                onClick={() => {
                                  setPricingOrderId(pricingOrderId === order.id ? null : order.id);
                                  setPricingDiscount((order.discountAmount || 0).toString());
                                  setPricingDiscountNote(order.discountNote || '');
                                  setPricingDelivery((order.deliveryCharge || 0).toString());
                                  setPricingDeliveryNote(order.deliveryChargeNote || '');
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-bold transition-colors cursor-pointer"
                              >
                                🏷️ Adjust Pricing &amp; Bill
                              </button>

                              {/* Record Payment Button */}
                              {order.paymentStatus !== 'PAID' && (
                                <button
                                  onClick={() => {
                                    setPaymentOrderId(paymentOrderId === order.id ? null : order.id);
                                    setPaymentMethodInput('UPI');
                                    setPaymentRefInput('');
                                  }}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 font-bold transition-colors cursor-pointer"
                                >
                                  💳 Record Payment
                                </button>
                              )}

                              {/* Dispatch / Tracking Button */}
                              <button
                                onClick={() => {
                                  setDispatchOrderId(dispatchOrderId === order.id ? null : order.id);
                                  setCourierInput(order.courierName || 'Blue Dart Express');
                                  setTrackingNumInput(order.trackingNumber || '');
                                  setTrackingUrlInput(order.trackingUrl || '');
                                }}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl border border-blue-300 font-bold transition-colors cursor-pointer"
                              >
                                🚚 {order.courierName ? 'Update Courier Tracking' : 'Dispatch & Add Tracking'}
                              </button>

                              {/* Mark Delivered Button */}
                              {order.status !== 'DELIVERED' && (
                                <button
                                  onClick={() => handleMarkDelivered(order.id)}
                                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-xl border border-teal-300 font-bold transition-colors cursor-pointer"
                                >
                                  ✓ Mark Delivered
                                </button>
                              )}
                            </div>

                            {/* Pricing Adjustment Drawer */}
                            {pricingOrderId === order.id && (
                              <div className="bg-white p-4 rounded-xl border border-teal-300 space-y-3 animate-fadeIn">
                                <h4 className="text-xs font-black text-slate-900">Custom Pricing &amp; Surcharge Controls</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Discount Amount (₹)</label>
                                    <input
                                      type="number"
                                      value={pricingDiscount}
                                      onChange={(e) => setPricingDiscount(e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Discount Note</label>
                                    <input
                                      type="text"
                                      value={pricingDiscountNote}
                                      onChange={(e) => setPricingDiscountNote(e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                      placeholder="e.g. VIP Consultant Courtesy"
                                    />
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Delivery Charge (₹)</label>
                                    <input
                                      type="number"
                                      value={pricingDelivery}
                                      onChange={(e) => setPricingDelivery(e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Delivery Note</label>
                                    <input
                                      type="text"
                                      value={pricingDeliveryNote}
                                      onChange={(e) => setPricingDeliveryNote(e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                      placeholder="e.g. Express Air Cargo"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    onClick={() => setPricingOrderId(null)}
                                    className="px-3 py-1 text-slate-600 font-bold hover:bg-slate-100 rounded-lg text-xs"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSavePricing(order.id)}
                                    className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs shadow-xs"
                                  >
                                    Save Pricing Changes
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Record Payment Drawer */}
                            {paymentOrderId === order.id && (
                              <div className="bg-white p-4 rounded-xl border border-emerald-300 space-y-3 animate-fadeIn">
                                <h4 className="text-xs font-black text-slate-900">Record Customer Payment</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                                    <select
                                      value={paymentMethodInput}
                                      onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold bg-white"
                                    >
                                      <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                                      <option value="NET_BANKING">Net Banking / IMPS</option>
                                      <option value="CARD">Debit / Credit Card</option>
                                      <option value="COD">Cash On Delivery</option>
                                      <option value="CASH">Direct Cash</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Reference / UTR Number</label>
                                    <input
                                      type="text"
                                      value={paymentRefInput}
                                      onChange={(e) => setPaymentRefInput(e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                      placeholder="e.g. UPI-202611019842"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    onClick={() => setPaymentOrderId(null)}
                                    className="px-3 py-1 text-slate-600 font-bold hover:bg-slate-100 rounded-lg text-xs"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleRecordPayment(order.id)}
                                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs"
                                  >
                                    Confirm Payment Received
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Dispatch Courier Drawer */}
                            {dispatchOrderId === order.id && (
                              <div className="bg-white p-4 rounded-xl border border-blue-300 space-y-3 animate-fadeIn">
                                <h4 className="text-xs font-black text-slate-900">Courier Dispatch Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Courier Partner</label>
                                    <input
                                      type="text"
                                      value={courierInput}
                                      onChange={(e) => setCourierInput(e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                      placeholder="Blue Dart, Delhivery, etc."
                                    />
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Tracking Number *</label>
                                    <input
                                      type="text"
                                      value={trackingNumInput}
                                      onChange={(e) => setTrackingNumInput(e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                      placeholder="AWB / Consignment No"
                                    />
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Tracking Portal URL</label>
                                    <input
                                      type="text"
                                      value={trackingUrlInput}
                                      onChange={(e) => setTrackingUrlInput(e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                      placeholder="https://..."
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    onClick={() => setDispatchOrderId(null)}
                                    className="px-3 py-1 text-slate-600 font-bold hover:bg-slate-100 rounded-lg text-xs"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleUpdateDispatch(order.id)}
                                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-xs"
                                  >
                                    Save Tracking &amp; Mark Dispatched
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ACTIVE SHOPPING CART */}
              {inspectorTab === 'cart' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
                        Live Shopping Cart for {selectedUser.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Items currently placed in the customer&apos;s shopping bag on the storefront.
                      </p>
                    </div>

                    {selectedUser.cart && selectedUser.cart.length > 0 && (
                      <button
                        onClick={() => handleOpenAddOrder(selectedUser, true)}
                        className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Convert Cart to Official Order</span>
                      </button>
                    )}
                  </div>

                  {!selectedUser.cart || selectedUser.cart.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs space-y-2">
                      <ShoppingCart className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-600">Shopping Cart is Empty</p>
                      <p className="text-slate-400">
                        The customer does not currently have any active items in their shopping basket.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedUser.cart.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                              <div className="text-slate-500 text-[11px] mt-0.5">
                                Qty: {item.qty} {item.variant ? `• Variant: ${item.variant}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-black text-slate-900">
                              ₹{(item.price * item.qty).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between font-black text-slate-900 text-xs">
                        <span>Total Active Cart Value:</span>
                        <span className="text-emerald-800 text-sm">
                          ₹
                          {selectedUser.cart
                            .reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0)
                            .toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SUPPORT REQUESTS */}
              {inspectorTab === 'requests' && (
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
                      In-App Update Requests
                    </h3>
                    <p className="text-xs text-slate-500">
                      Customer requests for address revisions, PIN resets, or service inquiries.
                    </p>
                  </div>

                  {(!requestsByUser[selectedUser.id] || requestsByUser[selectedUser.id].length === 0) ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs space-y-2">
                      <div className="text-3xl">🔔</div>
                      <p className="font-semibold text-slate-600">No Support Requests</p>
                      <p className="text-slate-400">
                        This customer has not submitted any update or inquiry tickets.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {requestsByUser[selectedUser.id].map((req) => (
                        <div
                          key={req.id}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">
                                📌 {req.requestType.replace('_', ' ')}
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  req.status === 'RESOLVED'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : req.status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-amber-400 text-slate-950 animate-pulse'
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[10px] font-mono">{req.id}</span>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700">
                            {req.message}
                          </div>

                          {req.requestedData?.address && (
                            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 space-y-0.5">
                              <div className="font-bold text-[11px]">Proposed New Shipping Address:</div>
                              <div>{req.requestedData.address.street}</div>
                              <div>
                                {req.requestedData.address.city}, {req.requestedData.address.state} - {req.requestedData.address.pincode}
                              </div>
                            </div>
                          )}

                          {req.status === 'OPEN' ? (
                            <div className="space-y-2 pt-1 border-t border-slate-200">
                              <input
                                type="text"
                                placeholder="Resolution notes (e.g. Address updated in master registry)..."
                                value={resolutionNotes[req.id] || ''}
                                onChange={(e) =>
                                  setResolutionNotes({ ...resolutionNotes, [req.id]: e.target.value })
                                }
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => handleResolveRequest(req, 'REJECTED')}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold cursor-pointer transition-colors"
                                >
                                  Reject Request
                                </button>
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => handleResolveRequest(req, 'RESOLVED')}
                                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
                                >
                                  ✓ Approve &amp; Resolve
                                </button>
                              </div>
                            </div>
                          ) : (
                            req.adminNotes && (
                              <div className="text-[11px] text-slate-500 italic">
                                Consultant Note: {req.adminNotes}
                              </div>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MASTER PROFILE & ADDRESS */}
              {inspectorTab === 'profile' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
                      Customer Profile &amp; Contact Registry
                    </h3>

                    <button
                      onClick={() => handleOpenEditUser(selectedUser)}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Profile or Reset PIN</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="text-slate-400 font-bold uppercase text-[10px]">Contact Credentials</div>
                      <div className="space-y-1">
                        <div>
                          <span className="text-slate-500 font-medium">Full Name:</span>{' '}
                          <span className="font-black text-slate-900">{selectedUser.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Mobile (Login Key):</span>{' '}
                          <span className="font-mono font-black text-slate-900">{selectedUser.mobile}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Email:</span>{' '}
                          <span className="font-mono text-slate-800">{selectedUser.email || 'None on file'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Login PIN:</span>{' '}
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                            {selectedUser.password}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="text-slate-400 font-bold uppercase text-[10px]">Registered Delivery Address</div>
                      {selectedUser.address?.street || selectedUser.address?.city ? (
                        <div className="space-y-0.5 text-slate-800">
                          <p className="font-medium">{selectedUser.address.street}</p>
                          <p>
                            {selectedUser.address.city}, {selectedUser.address.state}
                          </p>
                          <p className="font-mono font-bold">{selectedUser.address.pincode}</p>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">No address on file yet.</div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 sm:col-span-2">
                      <div className="text-slate-400 font-bold uppercase text-[10px]">Consultant Notes &amp; History</div>
                      <p className="text-slate-700">
                        {selectedUser.notes || 'No consultant notes recorded for this customer.'}
                      </p>
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200 flex items-center justify-between">
                        <span>Account Created: {new Date(selectedUser.createdAt).toLocaleString('en-IN')}</span>
                        {selectedUser.lastLoginAt && (
                          <span>Last Active: {new Date(selectedUser.lastLoginAt).toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CREATE / EDIT CUSTOMER MODAL */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeInOverlay">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden animate-drawerSlideIn">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEditingUser ? <Edit2 className="w-5 h-5 text-teal-300" /> : <UserPlus className="w-5 h-5 text-teal-300" />}
                <h3 className="font-extrabold text-base sm:text-lg">
                  {isEditingUser ? `Edit Customer: ${userFormData.name}` : 'Create Customer Account'}
                </h3>
              </div>
              <button
                onClick={() => setUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white"
                    placeholder="e.g. Ramesh Sharma"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mobile Number (Login Key) *</label>
                  <input
                    type="tel"
                    required
                    value={userFormData.mobile}
                    onChange={(e) => setUserFormData({ ...userFormData, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white font-mono"
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white"
                    placeholder="e.g. ramesh@gmail.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    {isEditingUser ? 'Reset Login PIN / Password' : 'Login PIN / Password *'}
                  </label>
                  <input
                    type="text"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white font-mono"
                    placeholder={isEditingUser ? 'Leave blank to keep unchanged' : 'e.g. 1234'}
                    required={!isEditingUser}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Street / Flat / Colony Address</label>
                  <input
                    type="text"
                    value={userFormData.street}
                    onChange={(e) => setUserFormData({ ...userFormData, street: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white"
                    placeholder="e.g. 402, Lotus Enclave, 5th Main"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">City</label>
                  <input
                    type="text"
                    value={userFormData.city}
                    onChange={(e) => setUserFormData({ ...userFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white"
                    placeholder="e.g. Hyderabad"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">State</label>
                  <input
                    type="text"
                    value={userFormData.state}
                    onChange={(e) => setUserFormData({ ...userFormData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white"
                    placeholder="e.g. Telangana"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">PIN Code</label>
                  <input
                    type="text"
                    value={userFormData.pincode}
                    onChange={(e) => setUserFormData({ ...userFormData, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white font-mono"
                    placeholder="e.g. 500081"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Account Status</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white font-bold"
                  >
                    <option value="ACTIVE">ACTIVE (Authorized to log in &amp; shop)</option>
                    <option value="SUSPENDED">SUSPENDED (Locked from purchasing)</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Consultant Notes</label>
                  <textarea
                    rows={2}
                    value={userFormData.notes}
                    onChange={(e) => setUserFormData({ ...userFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white"
                    placeholder="e.g. VIP client, preferred Nutrilite daily buyer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-800 to-emerald-700 hover:from-teal-900 hover:to-emerald-800 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : isEditingUser ? 'Update Profile' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ADD CONSIGNMENT ORDER MODAL */}
      {orderModalOpen && orderTargetUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeInOverlay">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-drawerSlideIn">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-300" />
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    Create Consignment Order
                  </h3>
                  <p className="text-xs text-teal-200">
                    For {orderTargetUser.name} ({orderTargetUser.mobile})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOrderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Product Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Add Products from Catalog</label>
                <select
                  onChange={(e) => {
                    const prodId = e.target.value;
                    if (!prodId) return;
                    const prod = products.find((p) => p.id === prodId);
                    if (!prod) return;

                    const existingIdx = orderItems.findIndex((i) => i.id === prod.id);
                    if (existingIdx >= 0) {
                      const updated = [...orderItems];
                      updated[existingIdx].qty += 1;
                      setOrderItems(updated);
                    } else {
                      setOrderItems([
                        ...orderItems,
                        {
                          id: prod.id,
                          name: prod.name,
                          price: prod.price,
                          qty: 1,
                          image: prod.image,
                        },
                      ]);
                    }
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a product to add to consignment...
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.price} ({p.weight || p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Selected */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Order Items ({orderItems.length})</span>
                  <span>
                    Subtotal: ₹
                    {orderItems.reduce((sum, item) => sum + item.price * item.qty, 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {orderItems.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                    No products added to this consignment yet. Select products above.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {orderItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{item.name}</p>
                          <p className="text-slate-500 text-[11px]">₹{item.price} each</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...orderItems];
                                if (updated[idx].qty > 1) {
                                  updated[idx].qty -= 1;
                                  setOrderItems(updated);
                                } else {
                                  setOrderItems(updated.filter((_, i) => i !== idx));
                                }
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono font-bold">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...orderItems];
                                updated[idx].qty += 1;
                                setOrderItems(updated);
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-mono font-bold text-slate-900 w-16 text-right">
                            ₹{(item.price * item.qty).toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 font-bold px-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing Adjustments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Custom Discount (₹)</label>
                  <input
                    type="number"
                    value={orderDiscount}
                    onChange={(e) => setOrderDiscount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Discount Note</label>
                  <input
                    type="text"
                    value={orderDiscountNote}
                    onChange={(e) => setOrderDiscountNote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="e.g. Festive Courtesy"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Charge (₹)</label>
                  <input
                    type="number"
                    value={orderDelivery}
                    onChange={(e) => setOrderDelivery(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Note</label>
                  <input
                    type="text"
                    value={orderDeliveryNote}
                    onChange={(e) => setOrderDeliveryNote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    placeholder="e.g. Express Air"
                  />
                </div>
              </div>

              {/* Status and Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Dispatch Status</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="REQUESTED">REQUESTED</option>
                    <option value="DISPATCHED">DISPATCHED</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Status</label>
                  <select
                    value={orderPaymentStatus}
                    onChange={(e) => setOrderPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                    <option value="COD">COD</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={orderPaymentMethod}
                    onChange={(e) => setOrderPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CARD">Card</option>
                    <option value="COD">Cash On Delivery</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Order Notes</label>
                <input
                  type="text"
                  value={orderNotesInput}
                  onChange={(e) => setOrderNotesInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  placeholder="Notes for order fulfillment..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || orderItems.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-800 to-emerald-700 hover:from-teal-900 hover:to-emerald-800 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Order...' : 'Confirm & Register Consignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. INVOICE MODAL */}
      {invoiceOrder && (
        <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      )}
    </div>
  );
}
