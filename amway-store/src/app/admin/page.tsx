'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Zap,
  RotateCw,
  ChevronDown,
  Search,
  Package,
  Layers,
  Activity,
  CheckCircle2,
  Users,
  MessageSquare,
  Image as ImageIcon,
  Lock,
  Settings,
  Plus,
  Check,
} from 'lucide-react';
import { UserAccount, CustomerOrder, AccountUpdateRequest } from '../../types/user';
import CustomerManagementStudio from '../../components/admin/CustomerManagementStudio';
import ContactSettingsModal from '../../components/admin/ContactSettingsModal';
import AdminPinLock from '../../components/admin/AdminPinLock';
import ChangePinModal from '../../components/admin/ChangePinModal';
import CategoryIcon from '../../components/CategoryIcon';
import { saveAdminSession, getAdminSession } from '../../utils/sessionManager';
import { adminFetch } from '../../utils/adminFetch';

export const dynamic = 'force-dynamic';

export interface ProductVariant {
  id?: string;
  sku: string;
  weight: string;
  price: number;
  mrp: number;
  savings?: number;
  discountPercent?: number;
  inStock?: boolean;
}

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId?: string;
  parentCategory?: string;
  parentCategoryId?: string;
  price: number;
  mrp: number;
  savings: number;
  weight: string;
  variants?: ProductVariant[];
  image: string;
  images: string[];
  usp?: string;
  complianceRating?: string;
  officialDetails?: {
    sku?: string;
    officialName?: string;
    detailsHtml?: string;
    featuresHtml?: string;
    benefitsHtml?: string;
    howToUseHtml?: string;
    ingredientsData?: {
      preText?: string;
      specificationTable?: Array<{
        ingredientName: string;
        values: Array<{ name: string; value: string }>;
      }>;
    };
    faqs?: Array<{
      question: string;
      answer: string;
    }>;
    galleryImages?: string[];
    classifications?: Array<{
      name: string;
      values: string[];
    }>;
  };
}

interface GlobalCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  order: number;
  parentId?: string | null;
}

interface BannerItem {
  id: string | number;
  image_url: string;
}

interface LeadItem {
  id: string;
  mobile: string;
  email?: string;
  name?: string;
  cart_items: Array<{
    id: string;
    name: string;
    qty: number;
    price: number;
  }>;
  created_at: string;
}

interface StockItem {
  sku: string;
  inStock: boolean;
  stockLevel: number | null;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  label: string;
  lastUpdated?: string;
}

export interface MonitorAlert {
  id: string;
  type: 'NEW_PRODUCT' | 'PRICE_CHANGE' | 'STOCK_UNAVAILABLE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  sku: string;
  productName: string;
  category?: string;
  createdAt: string;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  details: {
    oldPrice?: number;
    newPrice?: number;
    oldMrp?: number;
    newMrp?: number;
    priceDiff?: number;
    mrpDiff?: number;
    previousStockStatus?: string;
    currentStockStatus?: string;
    stockLevel?: number | null;
    stockLabel?: string;
    officialUrl?: string;
    imageUrl?: string;
    slug?: string;
    price?: number;
    mrp?: number;
    savings?: number;
    discountPercent?: number;
    inStock?: boolean;
    size?: string;
  };
}

export interface MonitorData {
  lastScanTimestamp: string | null;
  nextScanTimestamp: string | null;
  isScanning: boolean;
  lastScanDurationMs: number;
  totalProductsChecked: number;
  settings: {
    enabled: boolean;
    intervalMinutes: number;
    autoSyncStock: boolean;
    autoSyncPrices: boolean;
    notifyOnNewProducts: boolean;
  };
  alerts: MonitorAlert[];
  counts?: {
    total: number;
    newProducts: number;
    priceChanges: number;
    stockIssues: number;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'leads' | 'banners' | 'stock' | 'users' | 'monitor'>('products');
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Monitor state
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [loadingMonitor, setLoadingMonitor] = useState(false);
  const [scanningMonitor, setScanningMonitor] = useState(false);
  const [monitorTabFilter, setMonitorTabFilter] = useState<'ALL' | 'NEW_PRODUCT' | 'PRICE_CHANGE' | 'STOCK_UNAVAILABLE' | 'RESOLVED'>('NEW_PRODUCT');
  const [newProductsStockFilter, setNewProductsStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [monitorSearchQuery, setMonitorSearchQuery] = useState('');
  const [applyingAlertId, setApplyingAlertId] = useState<string | null>(null);
  const [verifyingSku, setVerifyingSku] = useState<string | null>(null);

  // Products state
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedStockFilter, setSelectedStockFilter] = useState('ALL');
  const [isCatFilterOpen, setIsCatFilterOpen] = useState(false);
  const [isIntervalMenuOpen, setIsIntervalMenuOpen] = useState(false);
  const catFilterRef = useRef<HTMLDivElement>(null);
  const intervalMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (catFilterRef.current && !catFilterRef.current.contains(e.target as Node)) {
        setIsCatFilterOpen(false);
      }
      if (intervalMenuRef.current && !intervalMenuRef.current.contains(e.target as Node)) {
        setIsIntervalMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Global Categories state
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<GlobalCategory> | null>(null);

  // Product Edit / Create Modal state
  const [editingProduct, setEditingProduct] = useState<Partial<ProductItem> | null>(null);
  const [editorSubTab, setEditorSubTab] = useState<'basic' | 'images' | 'overview' | 'features' | 'usage' | 'nutrition' | 'faqs'>('basic');
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Quantity Variants state for grouped pack sizes
  const [newVariantWeight, setNewVariantWeight] = useState('');
  const [newVariantSku, setNewVariantSku] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState<number | ''>('');
  const [newVariantMrp, setNewVariantMrp] = useState<number | ''>('');

  // Banners state
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);

  // Admin 4-Digit PIN Security State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [isCheckingPinSession, setIsCheckingPinSession] = useState<boolean>(true);
  const [changePinModalOpen, setChangePinModalOpen] = useState<boolean>(false);

  // Leads state
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');

  // Stock state
  const [stockMap, setStockMap] = useState<Record<string, StockItem>>({});
  const [syncingStock, setSyncingStock] = useState(false);

  // User Accounts & Customer Portal state
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [requestsOnlyFilter, setRequestsOnlyFilter] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // In-App Account Update Requests state
  const [accountRequests, setAccountRequests] = useState<AccountUpdateRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // User Inspector Modal state (tabs: profile, cart, orders, requests)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [userInspectorTab, setUserInspectorTab] = useState<'profile' | 'cart' | 'orders' | 'requests'>('profile');

  // User Create / Edit Modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userFormData, setUserFormData] = useState<{
    id?: string;
    name: string;
    mobile: string;
    email: string;
    password: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    notes: string;
    status: 'ACTIVE' | 'SUSPENDED';
    inquiryId?: string;
  }>({
    name: '',
    mobile: '',
    email: '',
    password: 'Nsquare@123',
    street: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
    status: 'ACTIVE',
  });

  // Order Create / Edit Modal state
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [orderFormData, setOrderFormData] = useState<{
    id?: string;
    userId: string;
    userName: string;
    userMobile: string;
    userEmail: string;
    shippingAddress: string;
    items: Array<{ id: string; name: string; qty: number; price: number; variant?: string; image?: string }>;
    totalAmount: number;
    totalMrp: number;
    savings: number;
    status: CustomerOrder['status'];
    paymentStatus: CustomerOrder['paymentStatus'];
    courierName: string;
    trackingNumber: string;
    trackingUrl: string;
    invoiceUrl: string;
    orderNotes: string;
  }>({
    userId: '',
    userName: '',
    userMobile: '',
    userEmail: '',
    shippingAddress: '',
    items: [],
    totalAmount: 0,
    totalMrp: 0,
    savings: 0,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    courierName: 'Blue Dart Express',
    trackingNumber: '',
    trackingUrl: '',
    invoiceUrl: '',
    orderNotes: '',
  });

  // Request Resolution inline notes
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null);
  const [adminResolutionNotes, setAdminResolutionNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load products from API
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await adminFetch('/api/products');
      const data = await res.json();
      if (data.products) setProductsList(data.products);
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Load global categories from API
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await adminFetch('/api/categories');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (e) {
      console.error('Failed to load categories:', e);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load banners
  const loadBanners = async () => {
    setLoadingBanners(true);
    try {
      const res = await adminFetch('/api/banners');
      const data = await res.json();
      if (data.banners) setBanners(data.banners);
    } catch (e) {
      console.error('Failed to load banners:', e);
    } finally {
      setLoadingBanners(false);
    }
  };

  // Load leads
  const loadLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await adminFetch('/api/leads');
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
    } catch (e) {
      console.error('Failed to load leads:', e);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Load stock cache
  const loadStock = async () => {
    try {
      const res = await adminFetch('/api/stock?summary=true');
      const data = await res.json();
      if (data.items) {
        setStockMap(data.items);
      }
    } catch (e) {
      console.error('Failed to load stock info:', e);
    }
  };

  // Load registered customer accounts
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await adminFetch('/api/users');
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load all customer orders
  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await adminFetch('/api/orders');
      const data = await res.json();
      if (data.orders && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load all in-app account update requests
  const loadAccountRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await adminFetch('/api/account-requests');
      const data = await res.json();
      if (data.requests && Array.isArray(data.requests)) {
        setAccountRequests(data.requests);
      }
    } catch (e) {
      console.error('Failed to load account requests:', e);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Load Amway official scheduled monitor data & alerts
  const loadMonitor = async () => {
    setLoadingMonitor(true);
    try {
      const res = await adminFetch('/api/monitor');
      const json = await res.json();
      if (json.data) setMonitorData(json.data);
    } catch (e) {
      console.error('Failed to load monitor data:', e);
    } finally {
      setLoadingMonitor(false);
    }
  };

  // Trigger live on-demand scan
  const triggerLiveScan = async () => {
    setScanningMonitor(true);
    showToast('⚡ Running live Amway official scan across sitemaps, prices, and stock...');
    try {
      const res = await adminFetch('/api/monitor?action=scan', { method: 'POST' });
      const json = await res.json();
      if (json.data) {
        setMonitorData(json.data);
        showToast(json.message || 'Scan completed successfully!');
        loadProducts();
        loadStock();
      }
    } catch (e: any) {
      showToast(`Scan error: ${e.message}`);
    } finally {
      setScanningMonitor(false);
    }
  };

  // Apply single alert
  const handleApplyAlert = async (alertId: string) => {
    setApplyingAlertId(alertId);
    try {
      const res = await adminFetch('/api/monitor/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', alertId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Alert applied successfully');
        if (json.data) setMonitorData(json.data);
        loadProducts();
        loadStock();
      } else {
        showToast(`Error: ${json.message || json.error}`);
      }
    } catch (e: any) {
      showToast(`Action failed: ${e.message}`);
    } finally {
      setApplyingAlertId(null);
    }
  };

  // Dismiss single alert
  const handleDismissAlert = async (alertId: string) => {
    try {
      const res = await adminFetch('/api/monitor/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', alertId }),
      });
      const json = await res.json();
      if (json.data) setMonitorData(json.data);
      showToast('Alert dismissed');
    } catch (e: any) {
      showToast(`Failed: ${e.message}`);
    }
  };

  // Batch apply alerts of a type
  const handleApplyAllAlerts = async (type: 'PRICE_CHANGE' | 'STOCK_UNAVAILABLE' | 'NEW_PRODUCT') => {
    setScanningMonitor(true);
    try {
      const res = await adminFetch('/api/monitor/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_all', type }),
      });
      const json = await res.json();
      if (json.data) setMonitorData(json.data);
      showToast(json.message || 'Batch updates applied!');
      loadProducts();
      loadStock();
    } catch (e: any) {
      showToast(`Batch action failed: ${e.message}`);
    } finally {
      setScanningMonitor(false);
    }
  };

  // Update schedule interval
  const handleUpdateScheduleInterval = async (minutes: number) => {
    try {
      const res = await adminFetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMinutes: minutes }),
      });
      const json = await res.json();
      if (json.settings && monitorData) {
        setMonitorData({ ...monitorData, settings: json.settings });
        showToast(`Scheduled scan interval updated to every ${minutes} minutes`);
      }
    } catch (e: any) {
      showToast(`Settings update failed: ${e.message}`);
    }
  };

  // Single-product live verification
  const handleVerifyProductLive = async (sku: string) => {
    setVerifyingSku(sku);
    try {
      const res = await adminFetch(`/api/stock?sku=${sku}&live=true`);
      const json = await res.json();
      if (json.stock) {
        setStockMap((prev) => ({ ...prev, [sku]: json.stock }));
        showToast(`Verified live stock for ${sku}: ${json.stock.label}`);
      }
    } catch (e: any) {
      showToast(`Live check failed: ${e.message}`);
    } finally {
      setVerifyingSku(null);
    }
  };

  const loadAllAdminData = () => {
    loadProducts();
    loadCategories();
    loadBanners();
    loadLeads();
    loadStock();
    loadUsers();
    loadOrders();
    loadAccountRequests();
    loadMonitor();
  };

  useEffect(() => {
    // Restore admin active tab from URL query params or session storage
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['products', 'categories', 'leads', 'banners', 'stock', 'users', 'monitor'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      } else {
        const saved = getAdminSession();
        if (saved?.activeTab && ['products', 'categories', 'leads', 'banners', 'stock', 'users', 'monitor'].includes(saved.activeTab)) {
          setActiveTab(saved.activeTab as any);
        }
      }
    }

    // Verify existing session token in sessionStorage
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
            loadAllAdminData();
          } else {
            sessionStorage.removeItem('nsquare_admin_token');
            setIsAdminUnlocked(false);
          }
        })
        .catch(() => {
          setIsAdminUnlocked(false);
        })
        .finally(() => {
          setIsCheckingPinSession(false);
        });
    } else {
      setIsCheckingPinSession(false);
      setIsAdminUnlocked(false);
    }
  }, []);

  // Persist activeTab changes to admin session
  useEffect(() => {
    saveAdminSession({ activeTab });
  }, [activeTab]);

  // Auto-refresh monitor alerts every 2 minutes when unlocked
  useEffect(() => {
    if (!isAdminUnlocked) return;
    const monitorInterval = setInterval(() => {
      loadMonitor();
    }, 120000);

    return () => clearInterval(monitorInterval);
  }, [isAdminUnlocked]);

  // Categories Hierarchy
  const parentCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId || c.parentId === 'root');
  }, [categories]);

  const subcategoriesMap = useMemo(() => {
    const map: Record<string, GlobalCategory[]> = {};
    categories.forEach((c) => {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    });
    return map;
  }, [categories]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return productsList.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.parentCategory || '').toLowerCase().includes(q);

      const matchCat =
        selectedCategoryFilter === 'ALL' ||
        (p.categoryId && p.categoryId === selectedCategoryFilter) ||
        (p.category || '').toLowerCase() === selectedCategoryFilter.toLowerCase() ||
        (p.parentCategoryId && p.parentCategoryId === selectedCategoryFilter) ||
        (p.parentCategory || '').toLowerCase() === selectedCategoryFilter.toLowerCase();

      const stockItem = stockMap[p.sku] || stockMap[p.id];
      const status = stockItem?.status || 'IN_STOCK';
      const matchStock =
        selectedStockFilter === 'ALL' ||
        (selectedStockFilter === 'IN_STOCK' && status === 'IN_STOCK') ||
        (selectedStockFilter === 'LOW_STOCK' && status === 'LOW_STOCK') ||
        (selectedStockFilter === 'OUT_OF_STOCK' && status === 'OUT_OF_STOCK');

      return matchQuery && matchCat && matchStock;
    });
  }, [productsList, searchQuery, selectedCategoryFilter, selectedStockFilter, stockMap]);

  // Clean and deduplicate monitor alerts against customer catalog
  const cleanAlerts = useMemo(() => {
    const rawAlerts = monitorData?.alerts || [];
    const catSkus = new Set<string>();

    const KNOWN_AMWAY_REDIRECTS: Record<string, string> = {
      '312357ID': '329159ID', // Weight Management Shake Mix Vanilla -> 329159ID in catalog
      '329877ID': '342574ID', // Ashwagandha -> 342574ID in catalog
      '329873ID': '342573ID', // Ginseng Cherry Plus -> 342573ID in catalog
      '313491ID': '342573ID', // Ginseng Cherry Plus -> 342573ID in catalog
      '329888ID': '342575ID', // Brahmi -> 342575ID in catalog
      '329884ID': '342576ID', // CH Balance -> 342576ID in catalog
      '313511ID': '342576ID', // CH Balance -> 342576ID in catalog
      '300864ID': '342567ID', // Love Your Bones Gummy -> 342567ID in catalog
      '329859ID': '342567ID', // Love Your Bones Gummy -> 342567ID in catalog
      '313503ID': '329889ID', // Multi Carotene -> 329889ID in catalog
      '313502ID': '329871ID', // Milk Thistle Plus -> 329871ID in catalog
      '313488ID': '329879ID', // Concentrated Fruits & Veg -> 329879ID in catalog
      '313520ID': '342578ID', // Vasaka -> 342578ID in catalog
      '313490ID': '342572ID', // I Candy Gummy -> 342572ID in catalog
      '313497ID': '329883ID', // Kids Acerola C -> 329883ID in catalog
      '316167ID': '329868ID', // Cherry Iron -> 329868ID in catalog
      '329892ID': '100066ID', // Salmon Omega 3 -> 100066ID in catalog
      '323327ID': '329861ID', // All Plant Protein limited pack -> 329861ID in catalog
      '313546ID': '329919ID', // Classic Family Toothbrush
      '312233ID': '329927ID', // Multi-Action Toothpaste Herbals
      '313533ID': '329923ID', // Advanced Toothbrush
      '308501ID': '329900ID', // Scalp Tonic
      '313550ID': '329900ID', // Scalp Tonic
      '308512ID': '329905ID', // Revitalizing Hair Mask
      '296556ID': '329950ID', // Insta Nourish Creamy Face Wash
      '296559ID': '329952ID', // Insta Nourish Gel Face Wash
      '313456ID': '329952ID', // Insta Nourish Gel Face Wash
      '308420ID': '329940ID', // Be Bright Face Wash
      '123781ID': '329931ID', // Skin Nutrition Cleanser
      '308422ID': '329941ID', // Be Bright Night Cream
      '313457ID': '329953ID', // Insta Nourish Rich Cream
      '313453ID': '329949ID', // Be Bright Scrub & Mask
      '313541ID': '329920ID', // Amla Hair Oil
      '313547ID': '329913ID', // 2-in-1 Shampoo & Conditioner
      '313548ID': '329902ID', // Anti Dandruff Shampoo
      '308508ID': '330106ID', // Glossy Repair Conditioner
    };

    const getTokens = (str: string) => {
      const stopWords = new Set([
        'nutrilite', 'amway', 'n by nutrilite', 'artistry', 'essentials', 'by',
        'glister', 'satinique', 'persona', 'and', 'for', 'the', 'with', 'plus', 'pack',
        'limited', 'edition', 'nutritious', 'delicious', 'tablets', 'capsules',
        'softgels', 'gummy', 'gummies', 'units', 'free'
      ]);
      return (str || '')
        .toLowerCase()
        .replace(/[®™©()]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2 && !stopWords.has(t));
    };

    productsList.forEach((p) => {
      if (p.sku) catSkus.add(p.sku.toLowerCase().trim());
      if (p.id) catSkus.add(p.id.toLowerCase().trim());
      if (p.variants) {
        p.variants.forEach((v) => {
          if (v.sku) catSkus.add(v.sku.toLowerCase().trim());
        });
      }
    });

    const seenTokens = new Map<string, boolean>();
    const seenSkus = new Set<string>();

    return rawAlerts.filter((a) => {
      if (a.type !== 'NEW_PRODUCT') return true;

      // 1. Resolve redirect or superseded SKU
      const activeSku = KNOWN_AMWAY_REDIRECTS[a.sku] || a.sku;
      const lowerActive = activeSku.toLowerCase().trim();
      const lowerRaw = a.sku.toLowerCase().trim();

      // 2. Direct SKU match in catalog
      if (catSkus.has(lowerActive) || catSkus.has(lowerRaw)) {
        return false;
      }

      // 3. Significant token coverage matching against catalog items
      const aTokens = getTokens(a.productName);
      if (aTokens.length === 0) return false;

      for (const p of productsList) {
        const cTokens = getTokens(p.name);
        if (cTokens.length === 0) continue;

        const shared = cTokens.filter((t) => aTokens.includes(t));
        const cCoverage = shared.length / cTokens.length;

        // Flavor check (e.g. Vanilla vs Chocolate vs Coffee)
        const flavors = ['vanilla', 'chocolate', 'coffee', 'orange', 'cherry', 'strawberry', 'lemon', 'mango'];
        const aFlavors = flavors.filter((f) => aTokens.includes(f));
        const cFlavors = flavors.filter((f) => cTokens.includes(f));
        if (aFlavors.length > 0 && cFlavors.length > 0 && aFlavors[0] !== cFlavors[0]) {
          continue;
        }

        if (cCoverage >= 0.70) {
          return false;
        }
      }

      // 4. Deduplicate among alerts themselves
      const normTokens = aTokens.join(' ');
      if (seenTokens.has(normTokens) || seenSkus.has(lowerActive)) {
        return false;
      }
      seenTokens.set(normTokens, true);
      seenSkus.add(lowerActive);

      return true;
    });
  }, [monitorData?.alerts, productsList]);

  // Inventory Metrics & Monitor Alerts
  const metrics = useMemo(() => {
    const total = productsList.length;
    let inStockCount = 0;
    productsList.forEach((p) => {
      const item = stockMap[p.sku] || stockMap[p.id];
      if (!item || item.status !== 'OUT_OF_STOCK') inStockCount++;
    });

    const pendingAlerts = cleanAlerts.filter((a) => a.status === 'PENDING');
    const newProductsAlertsCount = pendingAlerts.filter((a) => a.type === 'NEW_PRODUCT').length;
    const priceAlertsCount = pendingAlerts.filter((a) => a.type === 'PRICE_CHANGE').length;
    const stockAlertsCount = pendingAlerts.filter((a) => a.type === 'STOCK_UNAVAILABLE').length;

    return {
      totalProducts: total,
      totalCategories: categories.length,
      totalLeads: leads.length,
      totalUsers: users.length,
      openRequestsCount: accountRequests.filter((r) => r.status === 'OPEN').length,
      inStockPercentage: total > 0 ? Math.round((inStockCount / total) * 100) : 100,
      inStockProducts: inStockCount,
      outOfStockProducts: total - inStockCount,
      pendingAlertsCount: pendingAlerts.length,
      newProductsAlertsCount,
      priceAlertsCount,
      stockAlertsCount,
    };
  }, [productsList, categories, leads, users, accountRequests, stockMap, cleanAlerts]);

  // Stock counts for new products
  const newProductStockCounts = useMemo(() => {
    const list = cleanAlerts.filter(
      (a) => a.type === 'NEW_PRODUCT' && (monitorTabFilter === 'RESOLVED' ? a.status !== 'PENDING' : a.status === 'PENDING')
    );
    const inStock = list.filter((a) => a.details.inStock).length;
    const outOfStock = list.filter((a) => !a.details.inStock).length;
    return {
      all: list.length,
      inStock,
      outOfStock,
    };
  }, [cleanAlerts, monitorTabFilter]);

  // Filtered Monitor Alerts
  const filteredAlerts = useMemo(() => {
    const list = cleanAlerts;
    return list.filter((a) => {
      if (monitorTabFilter === 'RESOLVED') {
        if (a.status === 'PENDING') return false;
      } else {
        if (a.status !== 'PENDING') return false;
        if (monitorTabFilter !== 'ALL' && a.type !== monitorTabFilter) return false;
      }

      // Stock filter for new products
      if (a.type === 'NEW_PRODUCT' && newProductsStockFilter !== 'ALL') {
        if (newProductsStockFilter === 'IN_STOCK' && !a.details.inStock) return false;
        if (newProductsStockFilter === 'OUT_OF_STOCK' && a.details.inStock) return false;
      }

      if (monitorSearchQuery) {
        const q = monitorSearchQuery.toLowerCase().trim();
        const matchSku = a.sku.toLowerCase().includes(q);
        const matchName = a.productName.toLowerCase().includes(q);
        const matchCat = (a.category || '').toLowerCase().includes(q);
        return matchSku || matchName || matchCat;
      }

      return true;
    });
  }, [cleanAlerts, monitorTabFilter, monitorSearchQuery, newProductsStockFilter]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.mobile.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q);

      const matchStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;

      const hasOpenReq = accountRequests.some((r) => r.userId === u.id && r.status === 'OPEN');
      const matchReq = !requestsOnlyFilter || hasOpenReq;

      return matchQuery && matchStatus && matchReq;
    });
  }, [users, userSearchQuery, userStatusFilter, requestsOnlyFilter, accountRequests]);

  // Open Product Editor for Edit
  const handleEditProductClick = (prod: ProductItem) => {
    setIsNewProduct(false);
    setEditorSubTab('basic');

    // Ensure images array is initialized
    const images = prod.images && prod.images.length > 0 ? [...prod.images] : prod.image ? [prod.image] : [];

    // Ensure officialDetails is populated
    const officialDetails = prod.officialDetails ? { ...prod.officialDetails } : {
      sku: prod.sku,
      officialName: prod.name,
      detailsHtml: prod.usp || '',
      featuresHtml: '',
      benefitsHtml: '',
      howToUseHtml: '',
      ingredientsData: { preText: '', specificationTable: [] },
      faqs: [],
      galleryImages: images,
    };

    setEditingProduct({
      ...prod,
      images,
      officialDetails: {
        ...officialDetails,
        galleryImages: images,
        ingredientsData: officialDetails.ingredientsData || { preText: '', specificationTable: [] },
        faqs: officialDetails.faqs ? [...officialDetails.faqs] : [],
      },
    });
  };

  // Open Product Editor for New Product
  const handleAddProductClick = () => {
    setIsNewProduct(true);
    setEditorSubTab('basic');
    const firstSub = categories.find((c) => c.parentId === 'nutritional') || categories[0];
    const defaultCategory = firstSub ? firstSub.name : 'Protein Powders';
    const defaultCategoryId = firstSub ? firstSub.id : 'category1';

    setEditingProduct({
      name: '',
      sku: '',
      category: defaultCategory,
      categoryId: defaultCategoryId,
      parentCategory: 'Nutritional',
      parentCategoryId: 'nutritional',
      price: 0,
      mrp: 0,
      weight: '1 Unit',
      image: 'https://media.amway.in/sys-master/images/h5d/hf4/9263179530270/EIA.w800.h800.329861ID_1.png',
      images: ['https://media.amway.in/sys-master/images/h5d/hf4/9263179530270/EIA.w800.h800.329861ID_1.png'],
      usp: '',
      officialDetails: {
        officialName: '',
        detailsHtml: '',
        featuresHtml: '',
        benefitsHtml: '',
        howToUseHtml: '',
        ingredientsData: {
          preText: 'Nutritional Information (Approximate Values per Serving)',
          specificationTable: [],
        },
        faqs: [],
        galleryImages: ['https://media.amway.in/sys-master/images/h5d/hf4/9263179530270/EIA.w800.h800.329861ID_1.png'],
      },
    });
  };

  // Quantity Variant Handlers (Grouping)
  const handleAddVariant = () => {
    if (!editingProduct) return;
    if (!newVariantWeight.trim()) {
      alert('Pack size label is required (e.g. 500 g or 120 Tablets).');
      return;
    }
    const priceNum = Number(newVariantPrice) || 0;
    const mrpNum = Number(newVariantMrp) || priceNum;
    const skuCode = newVariantSku.trim() || `${editingProduct.sku || 'SKU'}-${newVariantWeight.trim().replace(/\s+/g, '')}`;

    const newVar: ProductVariant = {
      sku: skuCode,
      weight: newVariantWeight.trim(),
      price: priceNum,
      mrp: mrpNum,
      savings: Math.max(0, mrpNum - priceNum),
      discountPercent: mrpNum > priceNum ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0,
      inStock: true,
    };

    const currentVars = editingProduct.variants ? [...editingProduct.variants] : [];
    setEditingProduct({
      ...editingProduct,
      variants: [...currentVars, newVar],
    });

    setNewVariantWeight('');
    setNewVariantSku('');
    setNewVariantPrice('');
    setNewVariantMrp('');
  };

  const handleRemoveVariant = (idxToRemove: number) => {
    if (!editingProduct || !editingProduct.variants) return;
    const updated = editingProduct.variants.filter((_, idx) => idx !== idxToRemove);
    setEditingProduct({
      ...editingProduct,
      variants: updated,
    });
  };

  const handleSetDefaultVariant = (v: ProductVariant) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      sku: v.sku,
      weight: v.weight,
      price: v.price,
      mrp: v.mrp,
      savings: Math.max(0, v.mrp - v.price),
    });
  };

  // Save product (End-to-End Persistence)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name?.trim()) {
      alert('Product name is required.');
      return;
    }

    if (!editingProduct.sku?.trim()) {
      alert('Product SKU / Item code is required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...editingProduct,
        image: editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images[0] : editingProduct.image,
      };

      const res = await adminFetch('/api/products', {
        method: isNewProduct ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        showToast(isNewProduct ? 'Product created and live in store!' : 'Product updated and live in store!');
        setEditingProduct(null);
        loadProducts();
      } else {
        alert(result.error || 'Failed to save product');
      }
    } catch (err: any) {
      alert('Error saving product: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the catalog? This will immediately remove it from customer view.`)) return;
    try {
      const res = await adminFetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await res.json();
      if (result.success) {
        showToast('Product removed from catalog.');
        setProductsList((prev) => prev.filter((p) => p.id !== id && p.sku !== id));
      } else {
        alert(result.error || 'Failed to delete');
      }
    } catch (err: any) {
      alert('Error deleting: ' + err.message);
    }
  };

  // Images Reordering & Management
  const handleMoveImage = (idx: number, direction: 'left' | 'right') => {
    if (!editingProduct || !editingProduct.images) return;
    const images = [...editingProduct.images];
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;

    const temp = images[idx];
    images[idx] = images[targetIdx];
    images[targetIdx] = temp;

    setEditingProduct({
      ...editingProduct,
      images,
      image: images[0],
      officialDetails: {
        ...(editingProduct.officialDetails || {}),
        galleryImages: images,
      },
    });
  };

  const handleSetPrimaryImage = (idx: number) => {
    if (!editingProduct || !editingProduct.images || idx === 0) return;
    const images = [...editingProduct.images];
    const [chosen] = images.splice(idx, 1);
    images.unshift(chosen);

    setEditingProduct({
      ...editingProduct,
      images,
      image: images[0],
      officialDetails: {
        ...(editingProduct.officialDetails || {}),
        galleryImages: images,
      },
    });
  };

  const handleRemoveImage = (idx: number) => {
    if (!editingProduct || !editingProduct.images) return;
    if (editingProduct.images.length <= 1) {
      alert('Product must have at least one image.');
      return;
    }
    const images = [...editingProduct.images];
    images.splice(idx, 1);

    setEditingProduct({
      ...editingProduct,
      images,
      image: images[0],
      officialDetails: {
        ...(editingProduct.officialDetails || {}),
        galleryImages: images,
      },
    });
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim() || !editingProduct) return;
    const current = editingProduct.images ? [...editingProduct.images] : [];
    current.push(newImageUrl.trim());

    setEditingProduct({
      ...editingProduct,
      images: current,
      image: current[0],
      officialDetails: {
        ...(editingProduct.officialDetails || {}),
        galleryImages: current,
      },
    });
    setNewImageUrl('');
  };

  // Utility to convert file to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProductImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editingProduct) return;
    const file = e.target.files[0];
    try {
      const base64 = await fileToBase64(file);
      const current = editingProduct.images ? [...editingProduct.images] : [];
      current.push(base64);

      setEditingProduct({
        ...editingProduct,
        images: current,
        image: current[0],
        officialDetails: {
          ...(editingProduct.officialDetails || {}),
          galleryImages: current,
        },
      });
      showToast('New packaging image added.');
    } catch (e: any) {
      alert('Failed to process image: ' + e.message);
    }
  };

  // Nutrition Facts Row Controls
  const handleAddNutritionRow = () => {
    if (!editingProduct) return;
    const official = { ...(editingProduct.officialDetails || {}) };
    const ingredients = { ...(official.ingredientsData || { preText: '', specificationTable: [] }) };
    const table = ingredients.specificationTable ? [...ingredients.specificationTable] : [];

    table.push({
      ingredientName: 'New Nutrient / Vitamin',
      values: [
        { name: 'Per Serving', value: '10 mg' },
        { name: '% RDA (Adults)', value: '10%' },
      ],
    });

    ingredients.specificationTable = table;
    official.ingredientsData = ingredients;
    setEditingProduct({ ...editingProduct, officialDetails: official });
  };

  const handleRemoveNutritionRow = (idx: number) => {
    if (!editingProduct) return;
    const official = { ...(editingProduct.officialDetails || {}) };
    const ingredients = { ...(official.ingredientsData || { preText: '', specificationTable: [] }) };
    const table = ingredients.specificationTable ? [...ingredients.specificationTable] : [];
    table.splice(idx, 1);

    ingredients.specificationTable = table;
    official.ingredientsData = ingredients;
    setEditingProduct({ ...editingProduct, officialDetails: official });
  };

  const handleUpdateNutritionRow = (idx: number, field: 'name' | 'serving' | 'rda', val: string) => {
    if (!editingProduct) return;
    const official = { ...(editingProduct.officialDetails || {}) };
    const ingredients = { ...(official.ingredientsData || { preText: '', specificationTable: [] }) };
    const table = ingredients.specificationTable ? [...ingredients.specificationTable] : [];
    if (!table[idx]) return;

    if (field === 'name') {
      table[idx].ingredientName = val;
    } else if (field === 'serving') {
      if (!table[idx].values[0]) table[idx].values[0] = { name: 'Per Serving', value: '' };
      table[idx].values[0].value = val;
    } else if (field === 'rda') {
      if (!table[idx].values[1]) table[idx].values[1] = { name: '% RDA', value: '' };
      table[idx].values[1].value = val;
    }

    ingredients.specificationTable = table;
    official.ingredientsData = ingredients;
    setEditingProduct({ ...editingProduct, officialDetails: official });
  };

  // FAQs Controls
  const handleAddFaq = () => {
    if (!editingProduct) return;
    const official = { ...(editingProduct.officialDetails || {}) };
    const faqs = official.faqs ? [...official.faqs] : [];
    faqs.push({
      question: 'Frequently Asked Question',
      answer: '<p>Answer details for customers...</p>',
    });
    official.faqs = faqs;
    setEditingProduct({ ...editingProduct, officialDetails: official });
  };

  const handleRemoveFaq = (idx: number) => {
    if (!editingProduct) return;
    const official = { ...(editingProduct.officialDetails || {}) };
    const faqs = official.faqs ? [...official.faqs] : [];
    faqs.splice(idx, 1);
    official.faqs = faqs;
    setEditingProduct({ ...editingProduct, officialDetails: official });
  };

  const handleUpdateFaq = (idx: number, field: 'question' | 'answer', val: string) => {
    if (!editingProduct) return;
    const official = { ...(editingProduct.officialDetails || {}) };
    const faqs = official.faqs ? [...official.faqs] : [];
    if (!faqs[idx]) return;
    faqs[idx][field] = val;
    official.faqs = faqs;
    setEditingProduct({ ...editingProduct, officialDetails: official });
  };

  // Category Management Handlers
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name?.trim()) {
      alert('Category name is required.');
      return;
    }

    try {
      const isNew = !editingCategory.id;
      const res = await adminFetch('/api/categories', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategory),
      });
      const data = await res.json();
      if (data.success) {
        showToast(isNew ? 'Category created!' : 'Category updated!');
        setEditingCategory(null);
        loadCategories();
      } else {
        alert(data.error || 'Failed to save category');
      }
    } catch (e: any) {
      alert('Error saving category: ' + e.message);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Products in this category should be reassigned.`)) return;
    try {
      const res = await adminFetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Category deleted.');
        loadCategories();
      } else {
        alert(data.error || 'Failed to delete category');
      }
    } catch (e: any) {
      alert('Error deleting: ' + e.message);
    }
  };

  // Carousel Banner Upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const base64 = await fileToBase64(file);
      const res = await adminFetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', image_url: base64 }),
      });
      const result = await res.json();
      if (result.success) {
        if (result.banner) {
          setBanners((prev) => [...prev, result.banner]);
        } else {
          loadBanners();
        }
        showToast('Promotion banner added!');
      }
    } catch (e: any) {
      alert('Failed to upload banner: ' + e.message);
    }
  };

  const handleDeleteBanner = async (id: any) => {
    if (!confirm('Remove this promotional banner?')) return;
    try {
      const res = await adminFetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const result = await res.json();
      if (result.success) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
        showToast('Banner removed.');
      }
    } catch (e) {
      alert('Error deleting banner');
    }
  };

  // -------------------------------------------------------------
  // USER, ORDER & ACCOUNT REQUEST ACTION HANDLERS
  // -------------------------------------------------------------
  const handleOpenCreateUser = () => {
    setIsEditingUser(false);
    setUserFormData({
      name: '',
      mobile: '',
      email: '',
      password: 'Nsquare@123',
      street: '',
      city: '',
      state: '',
      pincode: '',
      notes: '',
      status: 'ACTIVE',
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserAccount) => {
    setIsEditingUser(true);
    setUserFormData({
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      email: u.email || '',
      password: u.password,
      street: u.address?.street || '',
      city: u.address?.city || '',
      state: u.address?.state || '',
      pincode: u.address?.pincode || '',
      notes: u.notes || '',
      status: u.status || 'ACTIVE',
      inquiryId: u.inquiryId,
    });
    setUserModalOpen(true);
  };

  const handleConvertLeadToUser = (lead: LeadItem) => {
    setIsEditingUser(false);
    setUserFormData({
      name: lead.name || 'Verified Customer',
      mobile: lead.mobile,
      email: lead.email || '',
      password: 'Nsquare@123',
      street: '',
      city: '',
      state: '',
      pincode: '',
      notes: `Created from inquiry lead (${lead.id}). Verified genuine interest online.`,
      status: 'ACTIVE',
      inquiryId: lead.id,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.mobile.trim() || !userFormData.name.trim()) {
      alert('Customer Name and Mobile Number are required.');
      return;
    }

    try {
      const payload = {
        ...(userFormData.id ? { id: userFormData.id } : {}),
        name: userFormData.name.trim(),
        mobile: userFormData.mobile.trim(),
        email: userFormData.email.trim(),
        password: userFormData.password.trim(),
        status: userFormData.status,
        notes: userFormData.notes,
        inquiryId: userFormData.inquiryId,
        address: {
          street: userFormData.street.trim(),
          city: userFormData.city.trim(),
          state: userFormData.state.trim(),
          pincode: userFormData.pincode.trim(),
        },
      };

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

      showToast(isEditingUser ? 'Customer profile updated.' : `User account created: ${data.user.id}`);
      setUserModalOpen(false);
      loadUsers();
      if (selectedUser && selectedUser.id === data.user.id) {
        setSelectedUser(data.user);
      }
    } catch (err) {
      alert('Network error while saving user');
    }
  };

  const handleToggleUserStatus = async (targetUser: UserAccount) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await adminFetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetUser.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Customer status updated to ${nextStatus}.`);
        loadUsers();
      } else {
        alert(data.error || 'Failed to update customer status');
      }
    } catch (e: any) {
      alert('Error updating customer status: ' + e.message);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete customer ${userName} (${userId})? This will revoke their portal access.`)) return;
    try {
      const res = await adminFetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Customer account deleted.');
        if (selectedUser?.id === userId) setSelectedUser(null);
        loadUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (e) {
      alert('Error deleting user');
    }
  };

  const handleOpenAddOrder = (u: UserAccount) => {
    setIsEditingOrder(false);
    const userCart = u.cart || [];
    const totalAmount = userCart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
    const formattedAddress = u.address?.street
      ? `${u.address.street}, ${u.address.city}, ${u.address.state} - ${u.address.pincode}`
      : 'Customer registered address';

    setOrderFormData({
      userId: u.id,
      userName: u.name,
      userMobile: u.mobile,
      userEmail: u.email || '',
      shippingAddress: formattedAddress,
      items: userCart.map((c) => ({
        id: c.id,
        name: c.name,
        qty: c.qty,
        price: c.price,
        variant: c.variant,
        image: c.image || undefined,
      })),
      totalAmount,
      totalMrp: Math.round(totalAmount * 1.15),
      savings: Math.round(totalAmount * 0.15),
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      courierName: 'Blue Dart Express',
      trackingNumber: `BLD-${Math.floor(100000000 + Math.random() * 900000000)}`,
      trackingUrl: 'https://www.bluedart.com',
      invoiceUrl: `/invoices/INV-${Date.now().toString().slice(-4)}.pdf`,
      orderNotes: 'Verified direct selling customer order.',
    });
    setOrderModalOpen(true);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderFormData.userId || orderFormData.items.length === 0) {
      alert('Please ensure customer is selected and at least one item is in the order.');
      return;
    }

    try {
      const res = await adminFetch('/api/orders', {
        method: isEditingOrder ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderFormData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to save order');
        return;
      }

      showToast(isEditingOrder ? 'Order updated.' : `Order registered: ${data.order.id}`);
      setOrderModalOpen(false);
      loadOrders();
    } catch (err) {
      alert('Error saving order');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Delete order consignment ${orderId}?`)) return;
    try {
      const res = await adminFetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Order consignment deleted.');
        loadOrders();
      } else {
        alert(data.error || 'Failed to delete order');
      }
    } catch (e) {
      alert('Error deleting order');
    }
  };

  const handleResolveAccountRequest = async (requestId: string, status: 'RESOLVED' | 'REJECTED') => {
    try {
      const res = await adminFetch('/api/account-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          status,
          adminNotes: adminResolutionNotes.trim() || (status === 'RESOLVED' ? 'Verified and updated in master profile by Admin.' : 'Declined by Administrator.'),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Request marked as ${status.toLowerCase()}.`);
        setResolvingRequestId(null);
        setAdminResolutionNotes('');
        loadAccountRequests();
      } else {
        alert(data.error || 'Failed to update request');
      }
    } catch (err) {
      alert('Error resolving request');
    }
  };

  // Security Gate: Check 4-Digit PIN Authentication
  if (isCheckingPinSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-teal-800 text-white flex items-center justify-center text-2xl animate-pulse shadow-lg shadow-teal-900/40">
          🔒
        </div>
        <p className="text-xs text-slate-400 mt-4 font-bold tracking-wide uppercase">Authenticating Security Credentials...</p>
      </div>
    );
  }

  if (!isAdminUnlocked) {
    return (
      <AdminPinLock
        onUnlock={() => {
          setIsAdminUnlocked(true);
          loadAllAdminData();
        }}
      />
    );
  }

  return (
    <div className="w-full space-y-6 pb-20 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-teal-500/30 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fadeInOverlay">
          <span className="text-emerald-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Admin Header Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="w-9 h-9 object-contain"
              onError={(e: any) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-950">N-Square Store Studio</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 uppercase tracking-wider">
                Admin Studio
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live product catalog, categories, end-to-end details, and orders control.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-xl transition-all shadow-2xs"
          >
            <span>←</span>
            <span>View Live Customer Store</span>
          </Link>
          <Link
            href="/validation"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl shadow-2xs transition-all"
            title="ICMR-NIN 2020 RDA Medical Standards Validation Studio"
          >
            <span>🔬</span>
            <span>Medical Validation Hub</span>
          </Link>
          <button
            onClick={() => setContactModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <span>⚙️</span>
            <span>Edit Contact Info</span>
          </button>
          <button
            onClick={() => setChangePinModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Change 4-Digit Security PIN"
          >
            <span>🔒</span>
            <span>Change PIN</span>
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('nsquare_admin_token');
              setIsAdminUnlocked(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Lock Admin Portal"
          >
            <span>🚪</span>
            <span>Lock</span>
          </button>
          <button
            onClick={handleAddProductClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>+</span>
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Interactive Studio Navigation & KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {/* KPI 1: Live Products */}
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`group relative text-left p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer focus:outline-none ${activeTab === 'products'
              ? 'bg-slate-900 text-white border-teal-500 shadow-md ring-2 ring-teal-500/50'
              : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-1 w-full mb-1.5">
            <span
              className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${activeTab === 'products' ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-700'
                }`}
            >
              Live Products
            </span>
            <span className="text-base sm:text-lg shrink-0">📦</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight">{metrics.totalProducts}</span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold truncate ${activeTab === 'products' ? 'text-slate-300' : 'text-slate-500'
                  }`}
              >
                In catalog
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span
                className={`text-[10px] font-bold ${activeTab === 'products' ? 'text-teal-300' : 'text-teal-700'
                  }`}
              >
                {activeTab === 'products' ? '● Active Studio' : 'Open Catalog →'}
              </span>
            </div>
          </div>
        </button>

        {/* KPI 2: Global Categories */}
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`group relative text-left p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer focus:outline-none ${activeTab === 'categories'
              ? 'bg-slate-900 text-white border-teal-500 shadow-md ring-2 ring-teal-500/50'
              : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-1 w-full mb-1.5">
            <span
              className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${activeTab === 'categories' ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-700'
                }`}
            >
              Categories
            </span>
            <span className="text-base sm:text-lg shrink-0">📁</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight">{metrics.totalCategories}</span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold truncate ${activeTab === 'categories' ? 'text-slate-300' : 'text-slate-500'
                  }`}
              >
                Taxonomies
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span
                className={`text-[10px] font-bold ${activeTab === 'categories' ? 'text-teal-300' : 'text-emerald-700'
                  }`}
              >
                {activeTab === 'categories' ? '● Active Studio' : 'Manage Tree →'}
              </span>
            </div>
          </div>
        </button>

        {/* KPI 3: Amway Live Sync & Alert Center */}
        <button
          type="button"
          onClick={() => setActiveTab('monitor')}
          className={`group relative text-left p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer focus:outline-none ${activeTab === 'monitor'
              ? 'bg-slate-900 text-white border-rose-500 shadow-md ring-2 ring-rose-500/50'
              : metrics.pendingAlertsCount > 0
                ? 'bg-gradient-to-br from-rose-50/80 to-white text-slate-900 border-rose-300 hover:border-rose-400 shadow-2xs'
                : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-1 w-full mb-1.5">
            <span
              className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${activeTab === 'monitor'
                  ? 'text-rose-400'
                  : metrics.pendingAlertsCount > 0
                    ? 'text-rose-700'
                    : 'text-slate-500 group-hover:text-slate-700'
                }`}
            >
              Amway Monitor
            </span>
            <span className="text-base sm:text-lg shrink-0">🚨</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl sm:text-3xl font-black tracking-tight ${activeTab === 'monitor'
                    ? 'text-white'
                    : metrics.pendingAlertsCount > 0
                      ? 'text-rose-600'
                      : 'text-slate-900'
                  }`}
              >
                {metrics.pendingAlertsCount}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold truncate ${activeTab === 'monitor'
                    ? 'text-slate-300'
                    : metrics.pendingAlertsCount > 0
                      ? 'text-rose-600 font-bold'
                      : 'text-slate-500'
                  }`}
              >
                {metrics.pendingAlertsCount > 0 ? 'Alerts' : 'In Sync'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span
                className={`text-[10px] font-bold ${activeTab === 'monitor'
                    ? 'text-rose-300'
                    : metrics.pendingAlertsCount > 0
                      ? 'text-rose-700 font-black'
                      : 'text-teal-700'
                  }`}
              >
                {activeTab === 'monitor' ? '● Active Studio' : metrics.pendingAlertsCount > 0 ? 'Sync Needed →' : 'View Hub →'}
              </span>
            </div>
          </div>
        </button>

        {/* KPI 4: Hub Stock Health */}
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`group relative text-left p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer focus:outline-none ${activeTab === 'stock'
              ? 'bg-slate-900 text-white border-teal-500 shadow-md ring-2 ring-teal-500/50'
              : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-1 w-full mb-1.5">
            <span
              className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${activeTab === 'stock' ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-700'
                }`}
            >
              Hub Stock
            </span>
            <span className="text-base sm:text-lg shrink-0">⚡</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight">{metrics.inStockPercentage}%</span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold truncate ${activeTab === 'stock' ? 'text-slate-300' : 'text-emerald-700 font-bold'
                  }`}
              >
                {metrics.inStockProducts} Ready
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span
                className={`text-[10px] font-bold ${activeTab === 'stock' ? 'text-teal-300' : 'text-emerald-700'
                  }`}
              >
                {activeTab === 'stock' ? '● Active Studio' : 'Live Levels →'}
              </span>
            </div>
          </div>
        </button>

        {/* KPI 5: Verified Customers (Direct Link to Full-Screen Customer Management Studio) */}
        <Link
          href="/admin/customers"
          className="group relative text-left p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer focus:outline-none bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-teal-500 shadow-2xs hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-1 w-full mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate text-slate-500 group-hover:text-teal-700">
              Customers
            </span>
            <span className="text-base sm:text-lg shrink-0">👥</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight">{metrics.totalUsers}</span>
              {metrics.openRequestsCount > 0 ? (
                <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full animate-pulse truncate">
                  {metrics.openRequestsCount} req
                </span>
              ) : (
                <span className="text-[10px] sm:text-[11px] font-semibold truncate text-slate-500">
                  Accounts
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-bold text-teal-700 group-hover:text-teal-900 flex items-center gap-1">
                <span>Manage All Customers</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 6: Customer Inquiries */}
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`group relative text-left p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer focus:outline-none ${activeTab === 'leads'
              ? 'bg-slate-900 text-white border-teal-500 shadow-md ring-2 ring-teal-500/50'
              : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-1 w-full mb-1.5">
            <span
              className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${activeTab === 'leads' ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-700'
                }`}
            >
              Inquiries
            </span>
            <span className="text-base sm:text-lg shrink-0">💬</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight">{metrics.totalLeads}</span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold truncate ${activeTab === 'leads' ? 'text-slate-300' : 'text-teal-800'
                  }`}
              >
                WhatsApp
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span
                className={`text-[10px] font-bold ${activeTab === 'leads' ? 'text-teal-300' : 'text-teal-700'
                  }`}
              >
                {activeTab === 'leads' ? '● Active Studio' : 'View Leads →'}
              </span>
            </div>
          </div>
        </button>

        {/* KPI 7: Store Banners */}
        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          className={`group relative text-left p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer focus:outline-none ${activeTab === 'banners'
              ? 'bg-slate-900 text-white border-teal-500 shadow-md ring-2 ring-teal-500/50'
              : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-1 w-full mb-1.5">
            <span
              className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider truncate ${activeTab === 'banners' ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-700'
                }`}
            >
              Banners
            </span>
            <span className="text-base sm:text-lg shrink-0">🖼️</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight">{banners.length}</span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold truncate ${activeTab === 'banners' ? 'text-slate-300' : 'text-slate-500'
                  }`}
              >
                Promo slides
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span
                className={`text-[10px] font-bold ${activeTab === 'banners' ? 'text-teal-300' : 'text-teal-700'
                  }`}
              >
                {activeTab === 'banners' ? '● Active Studio' : 'Edit Slides →'}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCT CATALOG & INVENTORY */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Controls: Search, Category Filter Dropdown, Stock Filter */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by Name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-teal-600 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              {/* Category Filter from Global Categories (Zero Clipping, Zero Emojis) */}
              <div className="relative flex-1 sm:flex-initial min-w-0 sm:min-w-[220px]" ref={catFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsCatFilterOpen(!isCatFilterOpen)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-teal-400 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer min-h-[38px] transition-all text-left"
                >
                  <span className="truncate">
                    {selectedCategoryFilter === 'ALL'
                      ? `All Categories & Departments (${productsList.length})`
                      : categories.find((c) => c.id === selectedCategoryFilter)?.name ||
                        parentCategories.find((p) => p.id === selectedCategoryFilter)?.name ||
                        selectedCategoryFilter}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${isCatFilterOpen ? 'rotate-180 text-teal-700' : ''}`} />
                </button>

                {isCatFilterOpen && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-full min-w-[240px] max-w-[calc(100vw-32px)] max-h-72 overflow-y-auto touch-scroll bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-40 animate-fadeInOverlay">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter('ALL');
                        setIsCatFilterOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        selectedCategoryFilter === 'ALL'
                          ? 'bg-teal-50 text-teal-900 font-black'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>All Categories &amp; Departments ({productsList.length})</span>
                      {selectedCategoryFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {parentCategories.map((parent) => {
                      const subs = subcategoriesMap[parent.id] || [];
                      const isParentActive = selectedCategoryFilter === parent.id;
                      return (
                        <div key={parent.id} className="py-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategoryFilter(parent.id);
                              setIsCatFilterOpen(false);
                            }}
                            className={`w-full px-3.5 py-1.5 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                              isParentActive ? 'bg-teal-50 text-teal-900' : 'text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <span>{parent.name} (All)</span>
                            {isParentActive && <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
                          </button>
                          {subs.map((sub) => {
                            const isSubActive = selectedCategoryFilter === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCategoryFilter(sub.id);
                                  setIsCatFilterOpen(false);
                                }}
                                className={`w-full pl-6 pr-3.5 py-1 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                  isSubActive ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <span>{sub.name}</span>
                                {isSubActive && <Check className="w-3 h-3 text-teal-700 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stock Filter */}
              <div className="relative sm:flex-initial min-w-0 sm:min-w-[130px]">
                <select
                  value={selectedStockFilter}
                  onChange={(e) => setSelectedStockFilter(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-teal-600 cursor-pointer min-h-[38px] transition-colors"
                >
                  <option value="ALL">All Stock</option>
                  <option value="IN_STOCK">In Stock Only</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-5">Product Details &amp; Images</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2 text-right">Direct Selling Price</div>
              <div className="col-span-1 text-center">Stock</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-500">
                  <div className="text-3xl mb-2">🔍</div>
                  <h3 className="font-bold text-slate-800 text-sm">No products match your filter</h3>
                  <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting All Categories.</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const stockItem = stockMap[p.sku] || stockMap[p.id];
                  const status = stockItem?.status || 'IN_STOCK';
                  const discountPct = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                  const imgCount = (p.images && p.images.length) || 1;

                  return (
                    <div
                      key={p.id}
                      className="p-4 sm:p-5 lg:px-6 flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 items-start lg:items-center hover:bg-teal-50/20 transition-colors"
                    >
                      {/* Product Info & Thumbnail */}
                      <div className="lg:col-span-5 flex items-center gap-3.5 w-full">
                        <div className="relative w-14 h-14 rounded-xl border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="max-h-full max-w-full object-contain"
                            onError={(e: any) => {
                              e.target.src = 'https://placehold.co/100x100/F0FDFA/0F766E?text=Amway';
                            }}
                          />
                          {imgCount > 1 && (
                            <span className="absolute bottom-0.5 right-0.5 bg-slate-900/80 text-white text-[9px] font-bold px-1 rounded">
                              {imgCount}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                              SKU: {p.sku}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Net: {p.weight}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm mt-0.5 truncate" title={p.name}>
                            {p.name}
                          </h3>
                          {p.usp && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {p.usp}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Category & Department */}
                      <div className="lg:col-span-2 flex flex-col items-start gap-1">
                        <span className="text-[11px] font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg truncate max-w-full">
                          {p.category}
                        </span>
                        {p.parentCategory && p.parentCategory.toLowerCase() !== (p.category || '').toLowerCase() && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            in {p.parentCategory}
                          </span>
                        )}
                      </div>

                      {/* Price Matrix */}
                      <div className="lg:col-span-2 lg:text-right w-full flex items-baseline justify-between lg:justify-end gap-2">
                        <span className="text-xs text-slate-400 lg:hidden font-medium">Price:</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-sm sm:text-base text-teal-950">
                            ₹{p.price.toLocaleString('en-IN')}
                          </span>
                          {p.mrp > p.price && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{p.mrp.toLocaleString('en-IN')}
                            </span>
                          )}
                          {discountPct > 0 && (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {discountPct}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stock Pill */}
                      <div className="lg:col-span-1 lg:text-center w-full flex items-center justify-between lg:justify-center">
                        <span className="text-xs text-slate-400 lg:hidden font-medium">Stock:</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status === 'OUT_OF_STOCK'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : status === 'LOW_STOCK'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${status === 'OUT_OF_STOCK'
                                ? 'bg-rose-500'
                                : status === 'LOW_STOCK'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                          />
                          <span>{status === 'OUT_OF_STOCK' ? 'Out' : status === 'LOW_STOCK' ? 'Low' : 'In Stock'}</span>
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="lg:col-span-2 lg:text-right w-full flex items-center justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <Link
                          href={`/product/${p.id}`}
                          target="_blank"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition-colors"
                          title="Open customer product detail view"
                        >
                          View ↗
                        </Link>
                        <button
                          onClick={() => handleEditProductClick(p)}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-[11px] font-bold text-teal-800 transition-colors cursor-pointer"
                        >
                          Edit Details
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold text-rose-700 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GLOBAL CATEGORIES MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Department &amp; Subcategory Hierarchy</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage top-level departments (Nutritional, Beauty, Personal Care, Home &amp; Living, Others) and their subcategories.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setEditingCategory({
                    name: '',
                    icon: '🏷️',
                    description: '',
                    order: parentCategories.length + 1,
                    parentId: null,
                  })
                }
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <span>+ Add Department</span>
              </button>
              <button
                onClick={() =>
                  setEditingCategory({
                    name: '',
                    icon: '🏷️',
                    description: '',
                    order: (subcategoriesMap['nutritional']?.length || 0) + 1,
                    parentId: 'nutritional',
                  })
                }
                className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <span>+ Add Subcategory</span>
              </button>
            </div>
          </div>

          {/* Department Hierarchy Cards */}
          <div className="space-y-6">
            {parentCategories.map((parent) => {
              const subs = subcategoriesMap[parent.id] || [];
              const subIds = new Set(subs.map((s) => s.id));
              const subNames = new Set(subs.map((s) => s.name.toLowerCase()));

              const totalProducts = productsList.filter(
                (p) =>
                  p.parentCategoryId === parent.id ||
                  (p.parentCategory && p.parentCategory.toLowerCase() === parent.name.toLowerCase()) ||
                  (p.categoryId && (p.categoryId === parent.id || subIds.has(p.categoryId))) ||
                  (p.category && subNames.has(p.category.toLowerCase()))
              ).length;

              return (
                <div
                  key={parent.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden"
                >
                  {/* Department Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-teal-50/20 to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-2xl bg-white border border-teal-200 shadow-2xs flex items-center justify-center">
                        <CategoryIcon id={parent.id} name={parent.name} className="w-6 h-6 text-teal-800" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base sm:text-lg text-slate-900">{parent.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            ID: {parent.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{parent.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-teal-100 text-teal-900">
                        {subs.length} Subcategories
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-700">
                        {totalProducts} Products
                      </span>
                      <button
                        onClick={() =>
                          setEditingCategory({
                            name: '',
                            icon: '🏷️',
                            description: '',
                            order: subs.length + 1,
                            parentId: parent.id,
                          })
                        }
                        className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
                      >
                        + Add Subcategory
                      </button>
                      <button
                        onClick={() => setEditingCategory({ ...parent })}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        title="Edit Department"
                      >
                        ✏️
                      </button>
                      {parent.id !== 'nutritional' && (
                        <button
                          onClick={() => handleDeleteCategory(parent.id, parent.name)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          title="Delete Department"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategories Grid */}
                  <div className="p-4 sm:p-5">
                    {subs.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                        <span className="text-2xl block mb-1">📂</span>
                        <span className="text-xs font-medium">
                          No subcategories defined for {parent.name} yet.
                        </span>
                        <div className="mt-2">
                          <button
                            onClick={() =>
                              setEditingCategory({
                                name: '',
                                icon: '🏷️',
                                description: '',
                                order: 1,
                                parentId: parent.id,
                              })
                            }
                            className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                          >
                            + Add First Subcategory
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subs.map((sub) => {
                          const count = productsList.filter(
                            (p) =>
                              p.categoryId === sub.id ||
                              (p.category || '').toLowerCase() === sub.name.toLowerCase()
                          ).length;

                          return (
                            <div
                              key={sub.id}
                              className="bg-white rounded-2xl p-3.5 border border-slate-200 hover:border-teal-300 shadow-2xs flex flex-col justify-between space-y-2.5 transition-all"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="p-1.5 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                                      <CategoryIcon id={sub.id} name={sub.name} className="w-4 h-4 text-teal-800" />
                                    </span>
                                    <div>
                                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                                        {sub.name}
                                      </h4>
                                      <span className="text-[9px] text-slate-400 font-mono">
                                        ID: {sub.id}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-50 text-teal-800 border border-teal-200">
                                    {count} Items
                                  </span>
                                </div>
                                {sub.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                    {sub.description}
                                  </p>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400">Order #{sub.order}</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => setEditingCategory({ ...sub })}
                                    className="px-2.5 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(sub.id, sub.name)}
                                    className="px-2.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CUSTOMER ORDER LEADS */}
      {/* ========================================================================= */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search leads by customer mobile or email..."
                value={leadSearchQuery}
                onChange={(e) => setLeadSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-teal-600 focus:bg-white"
              />
            </div>
            <button
              onClick={loadLeads}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              🔄 Refresh Leads
            </button>
          </div>

          <div className="space-y-3">
            {leads.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
                <div className="text-3xl mb-2">📬</div>
                <h3 className="font-bold text-slate-800 text-sm">No customer order inquiries yet</h3>
                <p className="text-xs text-slate-400 mt-1">Customer checkouts initiated via WhatsApp will appear here.</p>
              </div>
            ) : (
              leads.map((lead) => {
                const totalInquiredPrice = (lead.cart_items || []).reduce(
                  (acc, item) => acc + (item.price || 0) * (item.qty || 1),
                  0
                );
                const leadPhoneDigits = (lead.mobile || '').replace(/\D/g, '');

                return (
                  <div
                    key={lead.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                          {lead.name || 'Customer'}
                        </span>
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg">
                          📱 {lead.mobile}
                        </span>
                        {lead.email && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            ✉️ {lead.email}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 ml-auto">
                          {new Date(lead.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Inquired Products ({lead.cart_items?.length || 0}):
                        </span>
                        <div className="space-y-1">
                          {(lead.cart_items || []).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                              <span className="truncate max-w-[280px] sm:max-w-md font-medium">
                                • {item.qty}x {item.name}
                              </span>
                              <span className="font-bold text-teal-900 shrink-0">
                                ₹{((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-extrabold text-slate-900">
                          <span>Total Cart Value:</span>
                          <span className="text-teal-950">₹{totalInquiredPrice.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex sm:flex-col items-center justify-end gap-2 w-full sm:w-48">
                      <a
                        href={`https://wa.me/${leadPhoneDigits}?text=${encodeURIComponent(
                          `Hello ${lead.name || 'there'}, thank you for inquiring about Amway wellness products with N-Square Store! We received your order inquiry and are ready to assist you.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span>💬</span>
                        <span>Reply on WhatsApp</span>
                      </a>

                      <button
                        onClick={() => handleConvertLeadToUser(lead)}
                        className="w-full text-center px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>✨</span>
                        <span>Create Customer Account</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PROMOTION BANNERS */}
      {/* ========================================================================= */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Homepage Carousel Banners</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload image banners displayed in the customer storefront hero slider.
              </p>
            </div>
            <label className="px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5">
              <span>+ Upload New Banner</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
                <div className="text-3xl mb-2">🖼️</div>
                <h3 className="font-bold text-slate-700 text-sm">No carousel banners active</h3>
                <p className="text-xs text-slate-400 mt-1">Click "Upload New Banner" to add an image banner.</p>
              </div>
            ) : (
              banners.map((banner, idx) => (
                <div
                  key={banner.id || idx}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group relative flex flex-col justify-between"
                >
                  <div className="w-full h-40 sm:h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
                    <img src={banner.image_url} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3.5 bg-white border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Slide #{idx + 1}</span>
                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Delete Banner
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REGIONAL WAREHOUSE STOCK HEALTH */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Regional Warehouse Stock Health</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time stock availability indicators checked against regional fulfillment centers.
              </p>
            </div>
            <button
              onClick={async () => {
                setSyncingStock(true);
                try {
                  const res = await adminFetch('/api/stock', { method: 'POST' });
                  const data = await res.json();
                  if (data.updatedCount) {
                    loadStock();
                  }
                  showToast('Stock synchronized with regional warehouses!');
                } finally {
                  setSyncingStock(false);
                }
              }}
              disabled={syncingStock}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>{syncingStock ? '⏳ Syncing...' : '🔄 Run On-Demand Warehouse Sync'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
              <div className="col-span-3">SKU &amp; Item</div>
              <div className="col-span-4">Product Name</div>
              <div className="col-span-3 text-center">Warehouse Status</div>
              <div className="col-span-2 text-right">Last Verified</div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto touch-scroll">
              {productsList.map((p) => {
                const stockItem = stockMap[p.sku] || stockMap[p.id];
                const status = stockItem?.status || 'IN_STOCK';
                const label = stockItem?.label || 'In Stock';

                return (
                  <div
                    key={p.sku}
                    className="p-3.5 sm:px-5 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 items-start sm:items-center text-xs"
                  >
                    <div className="sm:col-span-3 font-mono font-bold text-slate-900">{p.sku}</div>
                    <div className="sm:col-span-4 font-bold text-slate-800 truncate w-full" title={p.name}>
                      {p.name}
                    </div>
                    <div className="sm:col-span-3 sm:text-center w-full flex items-center justify-between sm:justify-center">
                      <span className="sm:hidden text-slate-400 font-medium">Status:</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status === 'OUT_OF_STOCK'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : status === 'LOW_STOCK'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${status === 'OUT_OF_STOCK'
                              ? 'bg-rose-500'
                              : status === 'LOW_STOCK'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                        />
                        <span>{label}</span>
                      </span>
                    </div>
                    <div className="sm:col-span-2 sm:text-right text-slate-400 text-[11px] w-full flex justify-between sm:justify-end">
                      <span className="sm:hidden font-medium">Sync:</span>
                      <span>
                        {stockItem?.lastUpdated
                          ? new Date(stockItem.lastUpdated).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : 'Cached'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: AMWAY OFFICIAL LIVE MONITOR & SCHEDULED ALERTS */}
      {/* ========================================================================= */}
      {activeTab === 'monitor' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Control Bar */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-lg font-bold">
                  <Activity className="w-5 h-5 text-teal-700" />
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Amway Official Live Monitor &amp; Alert Center
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Scheduled Background Monitor Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Automated tasks monitor the Amway India official website, sitemaps, and regional fulfillment hubs to alert you to new product launches, catalog price/MRP updates, and out-of-stock items.
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
              {/* Live Monitor Interval Selector (Custom Tailwind Dropdown) */}
              <div className="relative" ref={intervalMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsIntervalMenuOpen(!isIntervalMenuOpen)}
                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500 font-medium">Interval:</span>
                  <span className="font-bold text-teal-900">
                    {(() => {
                      const mins = monitorData?.settings.intervalMinutes || 30;
                      if (mins === 15) return 'Every 15 mins';
                      if (mins === 30) return 'Every 30 mins (Default)';
                      if (mins === 60) return 'Every 1 hour';
                      if (mins === 360) return 'Every 6 hours';
                      if (mins === 1440) return 'Every 24 hours';
                      return `Every ${mins} mins`;
                    })()}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isIntervalMenuOpen ? 'rotate-180 text-teal-700' : ''}`} />
                </button>

                {isIntervalMenuOpen && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-40 animate-fadeInOverlay">
                    {[
                      { value: 15, label: 'Every 15 mins' },
                      { value: 30, label: 'Every 30 mins (Default)' },
                      { value: 60, label: 'Every 1 hour' },
                      { value: 360, label: 'Every 6 hours' },
                      { value: 1440, label: 'Every 24 hours' },
                    ].map((opt) => {
                      const isSel = (monitorData?.settings.intervalMinutes || 30) === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            handleUpdateScheduleInterval(opt.value);
                            setIsIntervalMenuOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                            isSel ? 'bg-teal-50 text-teal-900 font-black' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={triggerLiveScan}
                disabled={scanningMonitor}
                className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {scanningMonitor ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{scanningMonitor ? 'Scanning Amway Server...' : 'Run Live Check Now'}</span>
              </button>
            </div>
          </div>

          {/* Sync Status Info Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400">Last Scanned</div>
              <div className="font-bold text-slate-800 mt-0.5 truncate">
                {monitorData?.lastScanTimestamp
                  ? new Date(monitorData.lastScanTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Pending first run'}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400">Next Scheduled Scan</div>
              <div className="font-bold text-teal-700 mt-0.5 truncate">
                {monitorData?.nextScanTimestamp
                  ? new Date(monitorData.nextScanTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Automated in background'}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400">Items Scanned</div>
              <div className="font-bold text-slate-800 mt-0.5 truncate">
                {monitorData?.totalProductsChecked || productsList.length} Verified
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400">Scan Duration</div>
              <div className="font-bold text-slate-800 mt-0.5 truncate">
                {monitorData?.lastScanDurationMs ? `${(monitorData.lastScanDurationMs / 1000).toFixed(1)}s` : 'Instant'}
              </div>
            </div>
          </div>

          {/* Overview Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: New Products */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Amway Products</span>
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-bold">
                  🌟
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                  {metrics.newProductsAlertsCount}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Official additions not yet in catalog
                </div>
              </div>
              <div className="mt-3 text-[11px] font-semibold text-teal-800">
                Inspect items below to add manually if needed
              </div>
            </div>

            {/* Card 2: Price Changes */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Price Discrepancies</span>
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">
                  💰
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-amber-600">
                  {metrics.priceAlertsCount}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Official price or MRP differs
                </div>
              </div>
              {metrics.priceAlertsCount > 0 && (
                <button
                  onClick={() => handleApplyAllAlerts('PRICE_CHANGE')}
                  className="mt-3 w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Sync All Prices →
                </button>
              )}
            </div>

            {/* Card 3: Stock Unavailability */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hub Unavailability</span>
                <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center text-sm font-bold">
                  ⚠️
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-rose-600">
                  {metrics.stockAlertsCount}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Out of stock or low stock in warehouse
                </div>
              </div>
              {metrics.stockAlertsCount > 0 && (
                <button
                  onClick={() => handleApplyAllAlerts('STOCK_UNAVAILABLE')}
                  className="mt-3 w-full py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Sync Out-of-Stock Status →
                </button>
              )}
            </div>

            {/* Card 4: Catalog Alignment */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catalog Health</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">
                  🛡️
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                  {metrics.totalProducts > 0
                    ? `${Math.max(65, Math.round(((metrics.totalProducts - metrics.pendingAlertsCount) / metrics.totalProducts) * 100))}%`
                    : '100%'}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {productsList.length} store items monitored in real-time
                </div>
              </div>
              <div className="mt-3 text-[11px] font-semibold text-emerald-800">
                ✓ Continuous background polling
              </div>
            </div>
          </div>

          {/* Interactive Alert Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll no-scrollbar pb-1 md:pb-0">
              <button
                onClick={() => setMonitorTabFilter('NEW_PRODUCT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${monitorTabFilter === 'NEW_PRODUCT'
                    ? 'bg-teal-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
              >
                <span>🌟 New Products</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-teal-100 text-teal-900">
                  {metrics.newProductsAlertsCount}
                </span>
              </button>

              <button
                onClick={() => setMonitorTabFilter('PRICE_CHANGE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${monitorTabFilter === 'PRICE_CHANGE'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
              >
                <span>💰 Price Changes</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                  {metrics.priceAlertsCount}
                </span>
              </button>

              <button
                onClick={() => setMonitorTabFilter('STOCK_UNAVAILABLE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${monitorTabFilter === 'STOCK_UNAVAILABLE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
              >
                <span>⚠️ Stock Alerts</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-900">
                  {metrics.stockAlertsCount}
                </span>
              </button>

              <button
                onClick={() => setMonitorTabFilter('RESOLVED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${monitorTabFilter === 'RESOLVED'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                  }`}
              >
                ✓ Resolved History
              </button>
            </div>

            <div className="relative md:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Filter alerts by SKU or Name..."
                value={monitorSearchQuery}
                onChange={(e) => setMonitorSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-teal-600"
              />
            </div>
          </div>

          {/* Sub-Filter Bar for New Products Stock Availability */}
          {(monitorTabFilter === 'NEW_PRODUCT' || (monitorTabFilter === 'ALL' && metrics.newProductsAlertsCount > 0)) && (
            <div className="bg-white rounded-2xl p-3 sm:px-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📦 Stock Filter:</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setNewProductsStockFilter('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${newProductsStockFilter === 'ALL'
                        ? 'bg-teal-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                  >
                    All ({newProductStockCounts.all})
                  </button>
                  <button
                    onClick={() => setNewProductsStockFilter('IN_STOCK')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${newProductsStockFilter === 'IN_STOCK'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>In Stock ({newProductStockCounts.inStock})</span>
                  </button>
                  <button
                    onClick={() => setNewProductsStockFilter('OUT_OF_STOCK')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${newProductsStockFilter === 'OUT_OF_STOCK'
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Out of Stock ({newProductStockCounts.outOfStock})</span>
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {monitorTabFilter === 'NEW_PRODUCT'
                  ? `Showing ${filteredAlerts.length} verified official website products`
                  : 'Filter applies to newly detected website items'}
              </div>
            </div>
          )}

          {/* Alert Feed / Cards */}
          <div>
            {filteredAlerts.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto shadow-2xs">
                  ✨
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {monitorTabFilter === 'RESOLVED'
                    ? 'No resolved alerts in history'
                    : 'Catalog In Full Synchronization!'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {monitorTabFilter === 'RESOLVED'
                    ? 'Applied and dismissed alerts will appear here for audit tracking.'
                    : 'No pending price variances, new product launches, or regional stock unavailabilities detected at this time.'}
                </p>
                {monitorTabFilter !== 'RESOLVED' && (
                  <div className="pt-2">
                    <button
                      onClick={triggerLiveScan}
                      disabled={scanningMonitor}
                      className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Run Instant Re-Scan
                    </button>
                  </div>
                )}
              </div>
            ) : monitorTabFilter === 'NEW_PRODUCT' ? (
              /* Customer Portal Card Grid View for New Products */
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {filteredAlerts.map((alert) => {
                  const inStock = alert.details.inStock ?? true;
                  const price = alert.details.price || 0;
                  const mrp = alert.details.mrp || price;
                  const savings = alert.details.savings || (mrp > price ? mrp - price : 0);
                  const imageUrl = alert.details.imageUrl || 'https://placehold.co/300x300/F0FDFA/0F766E?text=Amway';

                  return (
                    <div
                      key={alert.id}
                      className="group relative flex flex-col justify-between bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-teal-400 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden h-full"
                    >
                      {/* Top Media Section */}
                      <div className="relative flex flex-col bg-gradient-to-b from-slate-50/80 to-white">
                        {/* Badges Overlay */}
                        <div className="w-full flex items-center justify-between gap-1 p-2.5 sm:p-3.5 pb-1">
                          {/* Stock Availability Pill */}
                          <span
                            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${!inStock
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : alert.details.stockLevel !== null && alert.details.stockLevel !== undefined && alert.details.stockLevel < 50
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${!inStock
                                  ? 'bg-rose-500'
                                  : alert.details.stockLevel !== null && alert.details.stockLevel !== undefined && alert.details.stockLevel < 50
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                            />
                            <span>{alert.details.stockLabel || (inStock ? 'In Stock' : 'Out of Stock')}</span>
                          </span>

                          <span className="text-[9px] sm:text-[10px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">
                            ✨ New
                          </span>
                        </div>

                        {/* Product Image with Hover Zoom */}
                        <div className="w-full flex justify-center py-2 px-3 sm:px-4">
                          <div className="relative w-full h-36 min-[480px]:h-40 sm:h-44 flex items-center justify-center overflow-hidden rounded-xl bg-white p-2">
                            <img
                              src={imageUrl}
                              alt={alert.productName}
                              className="max-h-full max-w-full object-contain transform group-hover:scale-108 transition-transform duration-300"
                              onError={(e: any) => {
                                e.target.src = 'https://placehold.co/300x300/F0FDFA/0F766E?text=Amway';
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Product Details Section */}
                      <div className="px-3 sm:px-4 pt-1 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Category & Weight Tags */}
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className="text-[9px] sm:text-[10px] font-bold text-teal-800 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-md truncate max-w-[130px] sm:max-w-[150px]">
                              {alert.category || 'Nutritional'}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold flex-shrink-0">
                              {alert.details.size || 'Standard'}
                            </span>
                          </div>

                          {/* Product Name & SKU */}
                          <h3
                            className="font-bold text-xs min-[480px]:text-sm text-slate-900 line-clamp-2 min-h-[2.5rem] leading-snug mb-1 group-hover:text-teal-700 transition-colors"
                            title={alert.productName}
                          >
                            {alert.productName}
                          </h3>

                          <div className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 inline-block px-1.5 py-0.5 rounded mb-2">
                            SKU: {alert.sku}
                          </div>

                          {/* Genuine Amway Fulfillment Line */}
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500 mb-2.5 font-medium">
                            <span className="shrink-0">🛡️</span>
                            <span className="truncate">Official Live Product on Amway Store</span>
                          </div>
                        </div>

                        {/* Pricing & Action Buttons Area */}
                        <div className="pt-2.5 pb-3 sm:pb-4 border-t border-slate-100">
                          <div className="flex items-baseline justify-between mb-2">
                            <div>
                              <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Selling Price</div>
                              <div className="flex items-baseline gap-1.5 sm:gap-2">
                                <span className="text-sm sm:text-base font-extrabold text-teal-900">
                                  ₹{price.toLocaleString('en-IN')}
                                </span>
                                {mrp > price && (
                                  <span className="text-[10px] sm:text-xs text-slate-400 line-through">
                                    ₹{mrp.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {savings > 0 && (
                              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap">
                                Save ₹{savings.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons Grid */}
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                            <a
                              href={alert.details.officialUrl || `https://www.amway.in/nutrilite/p/${alert.sku}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full text-center py-2 px-1 text-[11px] sm:text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors border border-teal-200 min-h-[38px] flex items-center justify-center gap-1"
                            >
                              <span>Official Page</span>
                              <span>↗</span>
                            </a>

                            {alert.status === 'PENDING' ? (
                              <button
                                onClick={() => handleDismissAlert(alert.id)}
                                className="w-full py-2 px-1 text-[11px] sm:text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer min-h-[38px] flex items-center justify-center gap-1"
                              >
                                ✕ Dismiss
                              </button>
                            ) : (
                              <span className="w-full py-2 px-1 text-[11px] sm:text-xs font-bold text-slate-400 bg-slate-50 rounded-xl min-h-[38px] flex items-center justify-center">
                                {alert.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Mixed / Standard Alert Rows */
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const isPrice = alert.type === 'PRICE_CHANGE';
                  const isNew = alert.type === 'NEW_PRODUCT';
                  const isStock = alert.type === 'STOCK_UNAVAILABLE';
                  const isPending = alert.status === 'PENDING';

                  return (
                    <div
                      key={alert.id}
                      className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${isStock
                          ? 'border-rose-200 hover:border-rose-300 bg-gradient-to-r from-rose-50/20 to-white'
                          : isPrice
                            ? 'border-amber-200 hover:border-amber-300 bg-gradient-to-r from-amber-50/20 to-white'
                            : 'border-teal-200 hover:border-teal-300 bg-gradient-to-r from-teal-50/20 to-white'
                        }`}
                    >
                      {/* Left: Info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${isStock
                                ? 'bg-rose-100 text-rose-800'
                                : isPrice
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-teal-100 text-teal-900'
                              }`}
                          >
                            {isStock ? '⚠️ Stock Issue' : isPrice ? '💰 Price Change' : '🌟 New Product'}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            {alert.sku}
                          </span>
                          {alert.category && (
                            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                              {alert.category}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!isPending && (
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                              {alert.status}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 leading-snug">
                          {alert.productName}
                        </h4>

                        {/* Content Diff Box */}
                        {isPrice && (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Selling Price</span>
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-slate-400 line-through">₹{alert.details.oldPrice}</span>
                                <span className="text-slate-400">➔</span>
                                <span className="text-teal-900 font-black">₹{alert.details.newPrice}</span>
                                {alert.details.priceDiff !== undefined && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-black ${alert.details.priceDiff > 0
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                  >
                                    {alert.details.priceDiff > 0 ? `+₹${alert.details.priceDiff}` : `-₹${Math.abs(alert.details.priceDiff)}`}
                                  </span>
                                )}
                              </div>
                            </div>

                            {alert.details.newMrp && (
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">MRP</span>
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span className="text-slate-400 line-through">₹{alert.details.oldMrp}</span>
                                  <span className="text-slate-400">➔</span>
                                  <span className="text-slate-800">₹{alert.details.newMrp}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {isStock && (
                          <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-200 text-xs flex items-center gap-3">
                            <span className="text-lg">📦</span>
                            <div>
                              <div className="font-bold text-rose-900">
                                Warehouse Status: {alert.details.currentStockStatus} ({alert.details.stockLabel || 'Out of Stock'})
                              </div>
                              <div className="text-[11px] text-rose-700">
                                {alert.details.stockLevel !== null && alert.details.stockLevel !== undefined
                                  ? `Current hub inventory: ${alert.details.stockLevel} units remaining`
                                  : 'Direct dispatch currently suspended from regional hub.'}
                              </div>
                            </div>
                          </div>
                        )}

                        {isNew && (
                          <div className="bg-teal-50/60 rounded-xl p-3 border border-teal-200 text-xs flex items-center gap-3">
                            {alert.details.imageUrl && (
                              <img
                                src={alert.details.imageUrl}
                                alt={alert.productName}
                                className="w-12 h-12 object-contain bg-white rounded-lg border border-teal-200 p-1 shrink-0"
                                onError={(e: any) => {
                                  e.target.src = 'https://placehold.co/300x300/F0FDFA/0F766E?text=Amway';
                                }}
                              />
                            )}
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${alert.details.inStock
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                    }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${alert.details.inStock ? 'bg-emerald-500' : 'bg-rose-500'
                                      }`}
                                  />
                                  <span>{alert.details.inStock ? 'In Stock' : 'Out of Stock'}</span>
                                </span>
                                {alert.details.size && (
                                  <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {alert.details.size}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-baseline gap-2 pt-0.5">
                                <span className="font-extrabold text-teal-900 text-sm">
                                  ₹{(alert.details.price || 0).toLocaleString('en-IN')}
                                </span>
                                {alert.details.mrp && alert.details.mrp > (alert.details.price || 0) && (
                                  <span className="text-[11px] text-slate-400 line-through">
                                    MRP ₹{alert.details.mrp.toLocaleString('en-IN')}
                                  </span>
                                )}
                                {alert.details.savings && alert.details.savings > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Save ₹{alert.details.savings}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0">
                        {isPending && (
                          <>
                            {(isPrice || isStock) && (
                              <button
                                onClick={() => handleApplyAlert(alert.id)}
                                disabled={applyingAlertId === alert.id}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer text-white whitespace-nowrap flex items-center gap-1.5 ${isStock
                                    ? 'bg-rose-600 hover:bg-rose-700'
                                    : 'bg-amber-600 hover:bg-amber-700'
                                  }`}
                              >
                                <span>{applyingAlertId === alert.id ? '⏳' : '✓'}</span>
                                <span>
                                  {isPrice
                                    ? `Update Price to ₹${alert.details.newPrice}`
                                    : 'Acknowledge Stock'}
                                </span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDismissAlert(alert.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </>
                        )}

                        <a
                          href={alert.details.officialUrl || `https://www.amway.in/nutrilite/p/${alert.sku}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1"
                        >
                          <span>Official Amway Page</span>
                          <span>↗</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-Time Catalog Price & Stock Monitor Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Real-Time Catalog Verification &amp; Official Price Tracker
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live verification of direct selling prices, retail prices, and regional warehouse dispatch readiness.
                </p>
              </div>
              <div className="text-xs font-bold text-slate-500">
                {productsList.length} Monitored Items
              </div>
            </div>

            <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-2">SKU</div>
              <div className="col-span-4">Product Name</div>
              <div className="col-span-2 text-right">Store Price / MRP</div>
              <div className="col-span-2 text-center">Warehouse Status</div>
              <div className="col-span-2 text-right">Live Verification</div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto touch-scroll">
              {productsList.map((p) => {
                const stockItem = stockMap[p.sku] || stockMap[p.id];
                const status = stockItem?.status || 'IN_STOCK';
                const label = stockItem?.label || 'In Stock';
                const isVerifying = verifyingSku === p.sku;

                return (
                  <div
                    key={p.sku}
                    className="p-3.5 sm:px-5 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-3 items-start md:items-center text-xs hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="md:col-span-2 font-mono font-bold text-slate-900">
                      {p.sku}
                    </div>
                    <div className="md:col-span-4 w-full">
                      <div className="font-bold text-slate-900 truncate" title={p.name}>
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.weight} • {p.category || 'Nutritional'}
                      </div>
                    </div>
                    <div className="md:col-span-2 md:text-right w-full flex justify-between md:block">
                      <span className="md:hidden text-slate-400 font-medium">Price:</span>
                      <div>
                        <div className="font-black text-teal-900">₹{p.price.toLocaleString('en-IN')}</div>
                        {p.mrp > p.price && (
                          <div className="text-[10px] text-slate-400 line-through">MRP ₹{p.mrp.toLocaleString('en-IN')}</div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2 md:text-center w-full flex justify-between md:justify-center items-center">
                      <span className="md:hidden text-slate-400 font-medium">Hub Status:</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status === 'OUT_OF_STOCK'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : status === 'LOW_STOCK'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${status === 'OUT_OF_STOCK' ? 'bg-rose-500' : status === 'LOW_STOCK' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                        />
                        <span>{label}</span>
                      </span>
                    </div>
                    <div className="md:col-span-2 md:text-right w-full flex justify-between md:justify-end items-center gap-2">
                      <span className="md:hidden text-slate-400 font-medium">Action:</span>
                      <button
                        onClick={() => handleVerifyProductLive(p.sku)}
                        disabled={isVerifying}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        title="Check live price and stock on Amway official website"
                      >
                        {isVerifying ? '⏳ Checking...' : '⚡ Check Live'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: USERS & CUSTOMER ACCOUNTS (CUSTOMER 360 & PIPELINE STUDIO) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 border border-teal-700/50 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">👥</span>
                <h3 className="text-base sm:text-lg font-black">Dedicated Full-Screen Customer Management Studio</h3>
              </div>
              <p className="text-xs text-teal-200">
                You can manage all customers in a dedicated, comfortable single-screen studio with search, orders, invoicing, and tracking.
              </p>
            </div>
            <Link
              href="/admin/customers"
              className="px-5 py-3 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
            >
              <span>Open Dedicated Customers Page</span>
              <span>→</span>
            </Link>
          </div>

          <CustomerManagementStudio
            users={users}
            orders={orders}
            accountRequests={accountRequests}
            onRefresh={() => {
              loadUsers();
              loadOrders();
              loadAccountRequests();
            }}
            onOpenCreateUser={handleOpenCreateUser}
            onOpenEditUser={handleOpenEditUser}
            onToggleUserStatus={handleToggleUserStatus}
            onSelectUser={(u) => {
              router.push(`/admin/customers/${u.id}`);
            }}
            onDeleteUser={(u) => handleDeleteUser(u.id, u.name)}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* END-TO-END PRODUCT EDIT / CREATE MODAL */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto touch-scroll flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeInOverlay">
          <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 shadow-2xl overflow-hidden animate-drawerSlideIn flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{isNewProduct ? '✨' : '✏️'}</span>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {isNewProduct ? 'Add New Product' : `Edit Product: ${editingProduct.name || editingProduct.sku}`}
                  </h3>
                  <p className="text-xs text-teal-200">
                    End-to-end control: Pricing, Image order, Overview, Features, Usage, Nutrition &amp; FAQs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2 flex items-center gap-1.5 overflow-x-auto touch-scroll no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setEditorSubTab('basic')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${editorSubTab === 'basic' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                🏷️ Basic &amp; Pricing
              </button>
              <button
                type="button"
                onClick={() => setEditorSubTab('images')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${editorSubTab === 'images' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <span>🖼️ Images &amp; Order</span>
                <span className="bg-teal-100 text-teal-800 text-[10px] px-1.5 py-0.2 rounded-full">
                  {editingProduct.images?.length || 1}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditorSubTab('overview')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${editorSubTab === 'overview' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                📄 Overview
              </button>
              <button
                type="button"
                onClick={() => setEditorSubTab('features')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${editorSubTab === 'features' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                ✨ Features &amp; Benefits
              </button>
              <button
                type="button"
                onClick={() => setEditorSubTab('usage')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${editorSubTab === 'usage' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                🥄 Usage &amp; Dosage
              </button>
              <button
                type="button"
                onClick={() => setEditorSubTab('nutrition')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${editorSubTab === 'nutrition' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                🧪 Nutrition Facts
              </button>
              <button
                type="button"
                onClick={() => setEditorSubTab('faqs')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${editorSubTab === 'faqs' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <span>❓ FAQs</span>
                <span className="bg-teal-100 text-teal-800 text-[10px] px-1.5 py-0.2 rounded-full">
                  {editingProduct.officialDetails?.faqs?.length || 0}
                </span>
              </button>
            </div>

            {/* Modal Body / Sub-Tab Forms */}
            <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 overflow-y-auto touch-scroll flex-1 space-y-4">
              {/* SUB-TAB 1: BASIC & PRICING */}
              {editorSubTab === 'basic' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Product Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      placeholder="e.g. NUTRILITE All Plant Protein Powder"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 min-h-[40px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">SKU (Official Item Code) *</label>
                      <input
                        type="text"
                        required
                        value={editingProduct.sku || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                        placeholder="e.g. 329861ID"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 min-h-[40px] font-mono"
                      />
                    </div>

                    {/* Category Selection from Global Categories Dropdown */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Category &amp; Department *</label>
                      <select
                        required
                        value={editingProduct.categoryId || editingProduct.category || ''}
                        onChange={(e) => {
                          const chosen = categories.find((c) => c.id === e.target.value || c.name === e.target.value);
                          const parent = chosen?.parentId ? categories.find((c) => c.id === chosen.parentId) : null;
                          setEditingProduct({
                            ...editingProduct,
                            category: chosen ? chosen.name : e.target.value,
                            categoryId: chosen ? chosen.id : editingProduct.categoryId,
                            parentCategory: parent ? parent.name : chosen && !chosen.parentId ? chosen.name : 'Nutritional',
                            parentCategoryId: parent ? parent.id : chosen && !chosen.parentId ? chosen.id : 'nutritional',
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 min-h-[40px] bg-white cursor-pointer font-semibold"
                      >
                        {parentCategories.map((parent) => {
                          const subs = subcategoriesMap[parent.id] || [];
                          if (subs.length === 0) {
                            return (
                              <option key={parent.id} value={parent.id}>
                                {parent.name}
                              </option>
                            );
                          }
                          return (
                            <optgroup key={parent.id} label={parent.name}>
                              <option value={parent.id}>{parent.name} (General)</option>
                              {subs.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  — {sub.name}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Direct Selling Price (₹) *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editingProduct.price ?? ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                        placeholder="e.g. 3591"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 min-h-[40px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">MRP (₹) *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editingProduct.mrp ?? ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value) })}
                        placeholder="e.g. 4140"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 min-h-[40px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Net Content / Size</label>
                      <input
                        type="text"
                        value={editingProduct.weight || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, weight: e.target.value })}
                        placeholder="e.g. 1 kg / 120 Tablets"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 min-h-[40px]"
                      />
                    </div>
                  </div>

                  {/* Real-time Discount Feedback */}
                  {(editingProduct.mrp || 0) > (editingProduct.price || 0) && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between font-bold">
                      <span>Customer Savings: ₹{((editingProduct.mrp || 0) - (editingProduct.price || 0)).toLocaleString('en-IN')}</span>
                      <span>
                        Discount: {Math.round((((editingProduct.mrp || 0) - (editingProduct.price || 0)) / (editingProduct.mrp || 1)) * 100)}% OFF
                      </span>
                    </div>
                  )}

                  {/* QUANTITY & PACK SIZE VARIANTS GROUPING */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>📦</span>
                          <span>Quantity &amp; Pack Size Grouping (Compare Options)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Group multiple sizes under this product so customers can compare quantity, cost, and discount without duplicate product pages.
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-full">
                        {editingProduct.variants?.length || 1} Variant(s)
                      </span>
                    </div>

                    {/* Existing Variants List */}
                    {editingProduct.variants && editingProduct.variants.length > 0 ? (
                      <div className="space-y-2">
                        {editingProduct.variants.map((v, idx) => {
                          const isCurrentDefault =
                            v.sku === editingProduct.sku && v.weight === editingProduct.weight;
                          const savings = Math.max(0, (v.mrp || 0) - (v.price || 0));
                          const discountPct =
                            (v.mrp || 0) > (v.price || 0)
                              ? Math.round((savings / (v.mrp || 1)) * 100)
                              : 0;

                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 transition-all ${isCurrentDefault
                                  ? 'bg-teal-50/80 border-teal-300 ring-1 ring-teal-200 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-extrabold text-xs text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                                  {v.weight}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">
                                  SKU: {v.sku}
                                </span>
                                {isCurrentDefault && (
                                  <span className="text-[9px] font-bold text-teal-800 bg-teal-200/60 px-1.5 py-0.2 rounded-full uppercase">
                                    Default
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right text-xs">
                                  <span className="font-black text-teal-900">
                                    ₹{v.price.toLocaleString('en-IN')}
                                  </span>
                                  {v.mrp > v.price && (
                                    <span className="text-[10px] text-slate-400 line-through ml-1.5">
                                      ₹{v.mrp.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                  {savings > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-700 ml-1.5">
                                      Save ₹{savings.toLocaleString('en-IN')} ({discountPct}% OFF)
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {!isCurrentDefault && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetDefaultVariant(v)}
                                      className="px-2 py-1 text-[10px] font-bold text-teal-800 hover:bg-teal-50 border border-teal-300 rounded-lg cursor-pointer"
                                      title="Set this variant as primary default"
                                    >
                                      Make Default
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariant(idx)}
                                    className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold cursor-pointer"
                                    title="Delete variant"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic bg-white p-2.5 rounded-xl border border-dashed border-slate-300">
                        Currently using base price and net content as the sole variant. Add additional pack sizes below to enable customer comparison.
                      </div>
                    )}

                    {/* Add New Variant Inline Form */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-slate-700 mb-1.5">
                        + Add Another Pack Size / Quantity:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <input
                          type="text"
                          value={newVariantWeight}
                          onChange={(e) => setNewVariantWeight(e.target.value)}
                          placeholder="Size (e.g. 500 g)"
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                        />
                        <input
                          type="text"
                          value={newVariantSku}
                          onChange={(e) => setNewVariantSku(e.target.value)}
                          placeholder="SKU (e.g. 329867ID)"
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-teal-600"
                        />
                        <input
                          type="number"
                          min={0}
                          value={newVariantPrice}
                          onChange={(e) => setNewVariantPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Price ₹"
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                        />
                        <input
                          type="number"
                          min={0}
                          value={newVariantMrp}
                          onChange={(e) => setNewVariantMrp(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="MRP ₹"
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                        />
                        <button
                          type="button"
                          onClick={handleAddVariant}
                          className="col-span-2 sm:col-span-1 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-lg text-xs transition-all cursor-pointer shadow-xs"
                        >
                          + Add Size
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Headline Summary / Clinical USP</label>
                    <textarea
                      rows={2}
                      value={editingProduct.usp || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, usp: e.target.value })}
                      placeholder="One or two complete sentences highlighting main formulation benefit..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600"
                    />
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: IMAGES REORDERING & MANAGEMENT */}
              {editorSubTab === 'images' && (
                <div className="space-y-4">
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-950 flex items-center justify-between">
                    <span>
                      💡 <strong>Image Order:</strong> The <strong>1st image</strong> is the primary cover image displayed in cards and catalog. Use the arrow buttons to reorder, or click ⭐ to set as primary.
                    </span>
                    <span className="font-bold text-teal-800">
                      Total: {editingProduct.images?.length || 0}
                    </span>
                  </div>

                  {/* Visual Image Reordering Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(editingProduct.images || []).map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-2xl border-2 p-2 bg-white flex flex-col items-center justify-between shadow-xs transition-all ${idx === 0 ? 'border-teal-600 ring-2 ring-teal-100' : 'border-slate-200'
                          }`}
                      >
                        <div className="relative w-full h-28 flex items-center justify-center p-1 overflow-hidden">
                          <img
                            src={imgUrl}
                            alt={`Image ${idx + 1}`}
                            className="max-h-full max-w-full object-contain"
                            onError={(e: any) => {
                              e.target.src = 'https://placehold.co/200x200/F0FDFA/0F766E?text=Error';
                            }}
                          />
                          {idx === 0 && (
                            <span className="absolute top-1 left-1 bg-teal-800 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                              ⭐ PRIMARY
                            </span>
                          )}
                          <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-bold px-1 rounded">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Controls */}
                        <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'left')}
                              disabled={idx === 0}
                              className={`p-1 rounded text-xs border ${idx === 0 ? 'text-slate-300 border-slate-200 opacity-50 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100 border-slate-300 cursor-pointer'
                                }`}
                              title="Move Left"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'right')}
                              disabled={idx === (editingProduct.images?.length || 1) - 1}
                              className={`p-1 rounded text-xs border ${idx === (editingProduct.images?.length || 1) - 1
                                  ? 'text-slate-300 border-slate-200 opacity-50 cursor-not-allowed'
                                  : 'text-slate-700 hover:bg-slate-100 border-slate-300 cursor-pointer'
                                }`}
                              title="Move Right"
                            >
                              →
                            </button>
                          </div>

                          <div className="flex gap-1">
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(idx)}
                                className="p-1 rounded text-[11px] bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                                title="Make Primary Image"
                              >
                                ⭐ Set Main
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1 rounded text-xs bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                              title="Delete Image"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Image Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">Add New Image:</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        placeholder="Paste image URL (https://media.amway.in/...)"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-teal-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold hover:bg-teal-900 transition-colors cursor-pointer shrink-0"
                      >
                        + Add by URL
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">Or upload file from computer:</span>
                      <label className="px-3.5 py-1.5 bg-white border border-teal-300 text-teal-800 hover:bg-teal-50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs">
                        <span>📁 Choose Image File</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleProductImageFileUpload} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: PRODUCT OVERVIEW */}
              {editorSubTab === 'overview' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Official Product Overview (HTML/Text)</label>
                      <span className="text-[10px] text-slate-400">Displayed under Overview tab</span>
                    </div>
                    <textarea
                      rows={12}
                      value={editingProduct.officialDetails?.detailsHtml || ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          officialDetails: {
                            ...(editingProduct.officialDetails || {}),
                            detailsHtml: e.target.value,
                          },
                        })
                      }
                      placeholder="<p>Full product explanation, clinical highlights, purpose...</p>"
                      className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-teal-600"
                    />
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: FEATURES & BENEFITS */}
              {editorSubTab === 'features' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Key Features (Bullet points / HTML)</label>
                    <textarea
                      rows={6}
                      value={editingProduct.officialDetails?.featuresHtml || ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          officialDetails: {
                            ...(editingProduct.officialDetails || {}),
                            featuresHtml: e.target.value,
                          },
                        })
                      }
                      placeholder="<ul><li>Feature 1...</li><li>Feature 2...</li></ul>"
                      className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-teal-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Benefits &amp; Support (HTML/Text)</label>
                    <textarea
                      rows={6}
                      value={editingProduct.officialDetails?.benefitsHtml || ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          officialDetails: {
                            ...(editingProduct.officialDetails || {}),
                            benefitsHtml: e.target.value,
                          },
                        })
                      }
                      placeholder="<p>Provides daily stamina, supports heart and cellular recovery...</p>"
                      className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-teal-600"
                    />
                  </div>
                </div>
              )}

              {/* SUB-TAB 5: USAGE & DOSAGE */}
              {editorSubTab === 'usage' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Recommended Usage &amp; Administration</label>
                    <p className="text-[11px] text-slate-500">
                      Dosage instructions, directions for consumption, and precautionary advice.
                    </p>
                    <textarea
                      rows={10}
                      value={editingProduct.officialDetails?.howToUseHtml || ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          officialDetails: {
                            ...(editingProduct.officialDetails || {}),
                            howToUseHtml: e.target.value,
                          },
                        })
                      }
                      placeholder="<p>Take 1 scoop daily with milk or water...</p>"
                      className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-teal-600"
                    />
                  </div>
                </div>
              )}

              {/* SUB-TAB 6: INGREDIENTS & NUTRITION FACTS */}
              {editorSubTab === 'nutrition' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Serving Size / Header Description</label>
                    <input
                      type="text"
                      value={editingProduct.officialDetails?.ingredientsData?.preText || ''}
                      onChange={(e) => {
                        const official = { ...(editingProduct.officialDetails || {}) };
                        const ing = { ...(official.ingredientsData || { preText: '', specificationTable: [] }) };
                        ing.preText = e.target.value;
                        official.ingredientsData = ing;
                        setEditingProduct({ ...editingProduct, officialDetails: official });
                      }}
                      placeholder="e.g. Serving Size: 1 Scoop (10 g approx.) | Serving per container: approx. 100"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Nutritional Specification Table</label>
                      <button
                        type="button"
                        onClick={handleAddNutritionRow}
                        className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        + Add Nutrient Row
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto touch-scroll">
                      {(editingProduct.officialDetails?.ingredientsData?.specificationTable || []).map((row, idx) => (
                        <div key={idx} className="p-2.5 flex items-center gap-2 bg-white">
                          <input
                            type="text"
                            value={row.ingredientName || ''}
                            onChange={(e) => handleUpdateNutritionRow(idx, 'name', e.target.value)}
                            placeholder="Nutrient Name"
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            value={row.values[0]?.value || ''}
                            onChange={(e) => handleUpdateNutritionRow(idx, 'serving', e.target.value)}
                            placeholder="Per Serving"
                            className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            value={row.values[1]?.value || ''}
                            onChange={(e) => handleUpdateNutritionRow(idx, 'rda', e.target.value)}
                            placeholder="% RDA"
                            className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNutritionRow(idx)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer text-xs"
                            title="Remove Row"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {(editingProduct.officialDetails?.ingredientsData?.specificationTable?.length || 0) === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No specification rows defined. Click "+ Add Nutrient Row" to add entries.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 7: FAQS MANAGEMENT */}
              {editorSubTab === 'faqs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Frequently Asked Questions (FAQs)</h4>
                      <p className="text-[11px] text-slate-500">
                        These appear in the accordion on mobile and FAQs tab on desktop.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFaq}
                      className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      + Add FAQ
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(editingProduct.officialDetails?.faqs || []).map((faq, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-teal-900">Q#{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFaq(idx)}
                            className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                          >
                            Remove FAQ
                          </button>
                        </div>
                        <input
                          type="text"
                          value={faq.question || ''}
                          onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                          placeholder="Question title..."
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                        />
                        <textarea
                          rows={3}
                          value={faq.answer || ''}
                          onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                          placeholder="Answer details..."
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono"
                        />
                      </div>
                    ))}
                    {(editingProduct.officialDetails?.faqs?.length || 0) === 0 && (
                      <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        No FAQs created yet. Click "+ Add FAQ" above to add customer questions.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400">
                  {isNewProduct ? 'Creating new catalog item' : `Editing SKU: ${editingProduct.sku}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{isSaving ? 'Saving...' : isNewProduct ? 'Create Product & Publish' : 'Save Changes & Update Store'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY ADD / EDIT MODAL */}
      {/* ========================================================================= */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 overflow-y-auto touch-scroll flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeInOverlay">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl p-6 space-y-4 animate-drawerSlideIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingCategory.id ? 'Edit Category' : 'Create Global Category'}
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="e.g. Traditional Herbs"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Parent Department (Optional)</label>
                <select
                  value={editingCategory.parentId || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, parentId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white"
                >
                  <option value="">[None — This is a Top-Level Department]</option>
                  {parentCategories
                    .filter((p) => p.id !== editingCategory.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Select Nutritional (or another department) to place this as a subcategory.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Icon / Emoji</label>
                  <input
                    type="text"
                    value={editingCategory.icon || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                    placeholder="e.g. 🌿"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Sort Order</label>
                  <input
                    type="number"
                    value={editingCategory.order || 1}
                    onChange={(e) => setEditingCategory({ ...editingCategory, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="Short description for customer discovery..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT CUSTOMER ACCOUNT */}
      {/* ========================================================================= */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeInOverlay">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden animate-drawerSlideIn flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">👤</span>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {isEditingUser ? `Edit Customer: ${userFormData.name}` : 'Create Verified Customer Account'}
                  </h3>
                  <p className="text-xs text-teal-200">
                    Accounts are managed exclusively by Admin. No customer self-registration.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mobile Number (Login Key) *</label>
                  <input
                    type="tel"
                    required
                    value={userFormData.mobile}
                    onChange={(e) => setUserFormData({ ...userFormData, mobile: e.target.value })}
                    placeholder="e.g. 9820192831"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="e.g. customer@example.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Custom Password *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder="e.g. Nsquare@123"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-slate-50 focus:bg-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Share this password with the verified customer.</p>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Delivery / Shipping Address
                </span>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Street / Flat / Locality</label>
                  <input
                    type="text"
                    value={userFormData.street}
                    onChange={(e) => setUserFormData({ ...userFormData, street: e.target.value })}
                    placeholder="e.g. Flat 402, Green Valley Apartments, Andheri West"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">City</label>
                    <input
                      type="text"
                      value={userFormData.city}
                      onChange={(e) => setUserFormData({ ...userFormData, city: e.target.value })}
                      placeholder="Mumbai"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">State</label>
                    <input
                      type="text"
                      value={userFormData.state}
                      onChange={(e) => setUserFormData({ ...userFormData, state: e.target.value })}
                      placeholder="Maharashtra"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Pincode</label>
                    <input
                      type="text"
                      value={userFormData.pincode}
                      onChange={(e) => setUserFormData({ ...userFormData, pincode: e.target.value })}
                      placeholder="400053"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-slate-50 focus:bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Status and Notes */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Account Status</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-white"
                  >
                    <option value="ACTIVE">ACTIVE (Authorized Access)</option>
                    <option value="SUSPENDED">SUSPENDED (Access Blocked)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Admin Verification Notes</label>
                  <input
                    type="text"
                    value={userFormData.notes}
                    onChange={(e) => setUserFormData({ ...userFormData, notes: e.target.value })}
                    placeholder="e.g. Verified customer interested in Nutrilite daily"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isEditingUser ? 'Save Profile Updates' : 'Create Customer Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: USER INSPECTOR & MANAGEMENT (FULL CONTROL) */}
      {/* ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeInOverlay">
          <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 shadow-2xl overflow-hidden animate-drawerSlideIn flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center font-black text-lg">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg">{selectedUser.name}</h3>
                    <span className="font-mono text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">
                      {selectedUser.id}
                    </span>
                    <span className="text-[10px] bg-emerald-400 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                      {selectedUser.status}
                    </span>
                  </div>
                  <p className="text-xs text-teal-200 mt-0.5">
                    📱 {selectedUser.mobile} {selectedUser.email ? `• ✉️ ${selectedUser.email}` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50 shrink-0 overflow-x-auto">
              <button
                onClick={() => setUserInspectorTab('profile')}
                className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer ${userInspectorTab === 'profile'
                    ? 'border-teal-700 text-teal-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                👤 Profile &amp; Password
              </button>

              <button
                onClick={() => setUserInspectorTab('cart')}
                className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${userInspectorTab === 'cart'
                    ? 'border-teal-700 text-teal-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <span>🛒 Synced Active Cart</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-900 font-bold">
                  {selectedUser.cart?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setUserInspectorTab('orders')}
                className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${userInspectorTab === 'orders'
                    ? 'border-teal-700 text-teal-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <span>📦 Consignment Orders</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-bold">
                  {orders.filter((o) => o.userId === selectedUser.id).length}
                </span>
              </button>

              <button
                onClick={() => setUserInspectorTab('requests')}
                className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${userInspectorTab === 'requests'
                    ? 'border-teal-700 text-teal-800 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <span>📝 In-App Update Requests</span>
                {accountRequests.filter((r) => r.userId === selectedUser.id && r.status === 'OPEN').length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black animate-pulse">
                    {accountRequests.filter((r) => r.userId === selectedUser.id && r.status === 'OPEN').length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* SUBTAB 1: PROFILE & CREDENTIALS */}
              {userInspectorTab === 'profile' && (
                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Full Name</span>
                      <p className="font-bold text-slate-900 text-sm">{selectedUser.name}</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile (Login Key)</span>
                      <p className="font-bold text-slate-900 text-sm font-mono">{selectedUser.mobile}</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Email</span>
                      <p className="font-medium text-slate-900">{selectedUser.email || 'None'}</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Password</span>
                      <p className="font-mono font-bold text-teal-800 text-sm">{selectedUser.password}</p>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Delivery Address</span>
                    {selectedUser.address?.street ? (
                      <p className="font-medium text-slate-800">
                        {selectedUser.address.street}, {selectedUser.address.city}, {selectedUser.address.state} - {selectedUser.address.pincode}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">No address registered yet.</p>
                    )}
                  </div>

                  {/* Consultant Notes */}
                  {selectedUser.notes && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-950">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block mb-0.5">Admin Verification Notes</span>
                      <p className="text-xs">{selectedUser.notes}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Created on {new Date(selectedUser.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    <button
                      onClick={() => handleOpenEditUser(selectedUser)}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>✏️</span>
                      <span>Edit Profile or Reset Password</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: SYNCED ACTIVE CART */}
              {userInspectorTab === 'cart' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Real-Time Synced Cart</h4>
                      <p className="text-xs text-slate-500">Live items stored in database under this customer&apos;s ID.</p>
                    </div>
                    {selectedUser.cart && selectedUser.cart.length > 0 && (
                      <button
                        onClick={() => handleOpenAddOrder(selectedUser)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        📦 Convert Cart to Official Order
                      </button>
                    )}
                  </div>

                  {!selectedUser.cart || selectedUser.cart.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                      Customer&apos;s active cart is currently empty.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedUser.cart.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white shrink-0" />
                            ) : (
                              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">🌿</div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                              {item.variant && <span className="text-[10px] text-slate-400">{item.variant}</span>}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-slate-500">Qty: {item.qty} × ₹{item.price.toLocaleString('en-IN')}</span>
                            <span className="font-black text-slate-900 block">
                              ₹{((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex justify-between text-xs font-extrabold text-teal-950">
                        <span>Total Live Cart Value:</span>
                        <span>
                          ₹{selectedUser.cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 3: PREVIOUS ORDERS */}
              {userInspectorTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Customer Orders &amp; Consignments</h4>
                      <p className="text-xs text-slate-500">Manage dispatch statuses, tracking numbers, and official invoice records.</p>
                    </div>
                    <button
                      onClick={() => handleOpenAddOrder(selectedUser)}
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <span>+</span>
                      <span>Add New Order</span>
                    </button>
                  </div>

                  {orders.filter((o) => o.userId === selectedUser.id).length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                      No orders registered for this customer yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders
                        .filter((o) => o.userId === selectedUser.id)
                        .map((order) => (
                          <div key={order.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">{order.id}</span>
                                <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-teal-100 text-teal-900">
                                  {order.status}
                                </span>
                              </div>
                              <span className="font-black text-slate-900 text-sm">
                                ₹{order.totalAmount.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Tracking snippet */}
                            <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                  Courier Consignment: {order.courierName || 'Courier Express'}
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                  {order.trackingNumber || 'Tracking Pending'}
                                </span>
                              </div>
                              {order.trackingUrl && (
                                <a
                                  href={order.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-700 hover:underline font-bold text-xs"
                                >
                                  Track Consignment ↗
                                </a>
                              )}
                            </div>

                            {/* Items snippet */}
                            <div className="space-y-1 text-xs text-slate-600">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>• {it.qty}x {it.name}</span>
                                  <span className="font-semibold text-slate-900">₹{(it.price * it.qty).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="text-rose-600 hover:text-rose-800 text-xs font-semibold px-2 py-1"
                              >
                                Delete Order
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: IN-APP UPDATE REQUESTS */}
              {userInspectorTab === 'requests' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">In-App Customer Update Requests</h4>
                    <p className="text-xs text-slate-500">
                      Requests submitted by this customer within the application. Resolve directly with admin response notes.
                    </p>
                  </div>

                  {accountRequests.filter((r) => r.userId === selectedUser.id).length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                      No in-app update requests from this customer.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {accountRequests
                        .filter((r) => r.userId === selectedUser.id)
                        .map((req) => (
                          <div key={req.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">{req.id}</span>
                                <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {req.requestType.replace('_', ' ')}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${req.status === 'OPEN'
                                    ? 'bg-amber-100 text-amber-900'
                                    : req.status === 'RESOLVED'
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : 'bg-rose-100 text-rose-900'
                                  }`}
                              >
                                {req.status === 'OPEN' ? '⏳ Open / Pending' : req.status}
                              </span>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium whitespace-pre-wrap">
                              {req.message}
                            </div>

                            {req.adminNotes && (
                              <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-900">
                                <strong>Admin Note: </strong>
                                {req.adminNotes}
                              </div>
                            )}

                            {req.status === 'OPEN' && (
                              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                  Admin Resolution Note
                                </span>
                                <input
                                  type="text"
                                  placeholder="e.g. Master address updated. Verified with customer."
                                  value={resolvingRequestId === req.id ? adminResolutionNotes : ''}
                                  onChange={(e) => {
                                    setResolvingRequestId(req.id);
                                    setAdminResolutionNotes(e.target.value);
                                  }}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                                />

                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    onClick={() => handleResolveAccountRequest(req.id, 'REJECTED')}
                                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold"
                                  >
                                    Decline Request
                                  </button>
                                  <button
                                    onClick={() => handleResolveAccountRequest(req.id, 'RESOLVED')}
                                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                                  >
                                    ✓ Mark Resolved
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE / EDIT CUSTOMER ORDER CONSIGNMENT */}
      {/* ========================================================================= */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto touch-scroll flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeInOverlay">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden animate-drawerSlideIn flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📦</span>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {isEditingOrder ? 'Update Order Consignment' : `Create Order for ${orderFormData.userName}`}
                  </h3>
                  <p className="text-xs text-teal-200">
                    Set tracking number, courier partner, dispatch status, and official invoice reference.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOrderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Order Dispatch Status</label>
                  <select
                    value={orderFormData.status}
                    onChange={(e) => setOrderFormData({ ...orderFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white font-semibold"
                  >
                    <option value="PENDING">PENDING (Awaiting Dispatch)</option>
                    <option value="CONFIRMED">CONFIRMED (Order Verified)</option>
                    <option value="DISPATCHED">DISPATCHED (In Transit)</option>
                    <option value="DELIVERED">DELIVERED (Fulfilled)</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Payment Status</label>
                  <select
                    value={orderFormData.paymentStatus}
                    onChange={(e) => setOrderFormData({ ...orderFormData, paymentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-teal-600 bg-white font-semibold"
                  >
                    <option value="PAID">PAID (UPI / Bank Transfer)</option>
                    <option value="COD">COD (Cash on Delivery)</option>
                    <option value="PENDING">PENDING PAYMENT</option>
                  </select>
                </div>
              </div>

              {/* Courier Consignment Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  🚚 Courier &amp; Consignment Tracking Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Courier Partner Name</label>
                    <input
                      type="text"
                      value={orderFormData.courierName}
                      onChange={(e) => setOrderFormData({ ...orderFormData, courierName: e.target.value })}
                      placeholder="e.g. Blue Dart Express or Delhivery"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Tracking / Docket Number</label>
                    <input
                      type="text"
                      value={orderFormData.trackingNumber}
                      onChange={(e) => setOrderFormData({ ...orderFormData, trackingNumber: e.target.value })}
                      placeholder="e.g. BLD-982341829"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Live Tracking URL</label>
                    <input
                      type="url"
                      value={orderFormData.trackingUrl}
                      onChange={(e) => setOrderFormData({ ...orderFormData, trackingUrl: e.target.value })}
                      placeholder="https://www.bluedart.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Invoice File URL / Reference</label>
                    <input
                      type="text"
                      value={orderFormData.invoiceUrl}
                      onChange={(e) => setOrderFormData({ ...orderFormData, invoiceUrl: e.target.value })}
                      placeholder="/invoices/INV-1001.pdf"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Delivery Address</label>
                <textarea
                  rows={2}
                  value={orderFormData.shippingAddress}
                  onChange={(e) => setOrderFormData({ ...orderFormData, shippingAddress: e.target.value })}
                  placeholder="Complete shipping address"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-teal-600 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Total & Items Breakdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Order Items ({orderFormData.items.length})
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {orderFormData.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-slate-800">• {it.qty}x {it.name}</span>
                      <span className="font-bold text-slate-900">₹{((it.price || 0) * (it.qty || 1)).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                  <span>Total Order Amount:</span>
                  <span className="text-teal-900">₹{orderFormData.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isEditingOrder ? 'Update Consignment' : 'Register Official Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Contact Settings Modal */}
      <ContactSettingsModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />

      {/* Admin 4-Digit Security PIN Modal */}
      <ChangePinModal
        isOpen={changePinModalOpen}
        onClose={() => setChangePinModalOpen(false)}
      />
    </div>
  );
}

