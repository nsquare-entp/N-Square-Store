'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Edit2,
  Lock,
  Unlock,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Package,
  ShoppingCart,
  AlertCircle,
  Search,
  Users,
  Trash2,
} from 'lucide-react';
import { UserAccount, CustomerOrder, AccountUpdateRequest } from '../../types/user';
import { getWhatsAppContactUrl } from '../../config/social';
import { adminFetch } from '../../utils/adminFetch';

interface CustomerManagementStudioProps {
  users: UserAccount[];
  orders: CustomerOrder[];
  accountRequests: AccountUpdateRequest[];
  onRefresh: () => void;
  onOpenCreateUser: () => void;
  onOpenEditUser: (user: UserAccount) => void;
  onToggleUserStatus: (user: UserAccount) => void;
  onSelectUser?: (user: UserAccount) => void;
  onDeleteUser?: (user: UserAccount) => void;
}

export default function CustomerManagementStudio({
  users,
  orders,
  accountRequests,
  onRefresh,
  onOpenCreateUser,
  onOpenEditUser,
  onToggleUserStatus,
  onSelectUser,
  onDeleteUser,
}: CustomerManagementStudioProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<'ALL' | 'NEEDS_ACTION' | 'ACTIVE' | 'VIP' | 'SUSPENDED'>('ALL');

  const handleDirectDelete = async (u: UserAccount) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete customer account "${u.name}" (${u.id})? This will revoke their portal access.`
      )
    ) {
      return;
    }
    try {
      const res = await adminFetch(`/api/users?id=${u.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
      } else {
        alert(data.error || 'Failed to delete customer');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    }
  };

  // Group orders & requests by user
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

  // Compute metrics per user
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

  // Overall directory metrics
  const totalLifetimeRevenue = useMemo(() => {
    return Object.values(userMetrics).reduce((sum, m) => sum + m.totalSpent, 0);
  }, [userMetrics]);

  const needsActionCount = useMemo(() => {
    return Object.values(userMetrics).filter((m) => m.hasPendingOrder || m.hasOpenRequest).length;
  }, [userMetrics]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    let list = users;
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      list = list.filter((u) => {
        const nameMatch = u.name.toLowerCase().includes(q);
        const mobileMatch = u.mobile.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const emailMatch = u.email && u.email.toLowerCase().includes(q);
        const cityMatch = u.address?.city && u.address.city.toLowerCase().includes(q);
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

  const handleCardClick = (user: UserAccount) => {
    router.push(`/admin/customers/${user.id}`);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar with Stats */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-800 shrink-0" />
              <span>Customer 360 Directory &amp; Omnichannel Pipeline</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any customer card to open their dedicated, comfortable full-screen 360° Studio for order processing, custom billing, and fulfillment tracking.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onRefresh}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 border border-slate-200"
              title="Reload customer directory"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">Refresh Directory</span>
            </button>

            <button
              onClick={onOpenCreateUser}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>+</span>
              <span>Create Customer Account</span>
            </button>
          </div>
        </div>

        {/* Directory High-Level KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registered Accounts</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{users.length}</div>
            <div className="text-[10px] text-teal-700 font-medium">
              {users.filter((u) => u.status === 'ACTIVE').length} Active • {users.filter((u) => u.status === 'SUSPENDED').length} Suspended
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Direct Store Revenue</div>
            <div className="text-xl font-black text-emerald-800 mt-0.5">₹{totalLifetimeRevenue.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-500 font-medium">{orders.length} total consignments</div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action Needed</div>
            <div className="text-xl font-black text-amber-600 mt-0.5">{needsActionCount}</div>
            <div className="text-[10px] text-slate-500 font-medium">Pending order requests / Inquiries</div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Shopping Carts</div>
            <div className="text-xl font-black text-indigo-700 mt-0.5">
              {users.filter((u) => u.cart && u.cart.length > 0).length}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Browsing with items in cart</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by customer name, phone number, city, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-teal-600 focus:bg-white"
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
            <span>🚨</span>
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

      {/* 3. Spacious Customer Cards Grid (Full Width, Comfortable Single Screen) */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-xs border border-slate-200 space-y-3">
          <div className="text-4xl">🔍</div>
          <h3 className="text-base font-bold text-slate-800">No Customers Match Filter</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search query or switching to &ldquo;All Accounts&rdquo;.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterTag('ALL');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredUsers.map((u) => {
            const m = userMetrics[u.id];

            return (
              <div
                key={u.id}
                onClick={() => handleCardClick(u)}
                className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-500/60 transition-all cursor-pointer flex flex-col justify-between space-y-3.5 relative"
              >
                {/* Top Row: Avatar & Status */}
                <div className="flex items-start justify-between gap-2.5 min-w-0">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-teal-800 to-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-teal-800 transition-colors">
                        {u.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 font-mono">
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
                <div className="pt-3 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* Quick WhatsApp Link */}
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
                      onClick={() => onOpenEditUser(u)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200 cursor-pointer flex items-center justify-center shrink-0"
                      title="Edit Customer Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Status Toggle */}
                    <button
                      onClick={() => onToggleUserStatus(u)}
                      className={`p-2 rounded-xl transition-colors border cursor-pointer flex items-center justify-center shrink-0 ${
                        u.status === 'ACTIVE'
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                      }`}
                      title={u.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                    >
                      {u.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    {/* Quick Delete Customer */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteUser) {
                          onDeleteUser(u);
                        } else {
                          handleDirectDelete(u);
                        }
                      }}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors border border-rose-200 cursor-pointer flex items-center justify-center shrink-0"
                      title="Permanently Delete Customer Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary CTA: Open Dedicated Full-Screen 360° Studio */}
                  <button
                    onClick={() => handleCardClick(u)}
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
    </div>
  );
}
