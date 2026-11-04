import {
  getCatalog,
  getProductById,
  searchProducts,
  upsertProduct,
  deleteProduct,
  getCategories,
  CatalogProduct,
  MedicalStandardRow,
} from '../services/catalogService';

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  mrp: number;
  qty: number;
  variant?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity?: string;
  items: OrderItem[];
  subtotalMrp: number;
  subtotalAbo: number;
  totalSavings: number;
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  healthGoal: string;
  notes?: string;
  status: 'new' | 'contacted' | 'consultation_scheduled' | 'converted' | 'closed';
  createdAt: string;
}

export interface ActiveCart {
  sessionId: string;
  items: OrderItem[];
  updatedAt: string;
}

// In-memory data structures
const orders: Order[] = [];
const leads: Lead[] = [];
const carts: Map<string, ActiveCart> = new Map();

// Default session ID for single-agent CLI sessions
export const DEFAULT_SESSION = 'default_session';

export function getOrCreateCart(sessionId: string = DEFAULT_SESSION): ActiveCart {
  if (!carts.has(sessionId)) {
    carts.set(sessionId, {
      sessionId,
      items: [],
      updatedAt: new Date().toISOString(),
    });
  }
  return carts.get(sessionId)!;
}

export function addItemToCart(
  productIdOrSku: string,
  qty: number = 1,
  sessionId: string = DEFAULT_SESSION
): { cart: ActiveCart; addedItem?: OrderItem; error?: string } {
  const product = getProductById(productIdOrSku);
  if (!product) {
    return { cart: getOrCreateCart(sessionId), error: `Product not found: ${productIdOrSku}` };
  }

  const cart = getOrCreateCart(sessionId);
  const existingIdx = cart.items.findIndex(
    i => i.productId === product.id || i.sku === product.sku
  );

  if (existingIdx >= 0) {
    cart.items[existingIdx].qty += qty;
  } else {
    cart.items.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      qty: Math.max(1, qty),
      variant: product.weight,
    });
  }

  cart.updatedAt = new Date().toISOString();
  return { cart, addedItem: cart.items[existingIdx >= 0 ? existingIdx : cart.items.length - 1] };
}

export function updateCartItemQuantity(
  productIdOrSku: string,
  qty: number,
  sessionId: string = DEFAULT_SESSION
): { cart: ActiveCart; error?: string } {
  const cart = getOrCreateCart(sessionId);
  const query = productIdOrSku.toLowerCase().trim();
  const idx = cart.items.findIndex(
    i => i.productId.toLowerCase() === query || i.sku.toLowerCase() === query
  );

  if (idx === -1) {
    return { cart, error: `Item not in cart: ${productIdOrSku}` };
  }

  if (qty <= 0) {
    cart.items.splice(idx, 1);
  } else {
    cart.items[idx].qty = qty;
  }

  cart.updatedAt = new Date().toISOString();
  return { cart };
}

export function clearCart(sessionId: string = DEFAULT_SESSION): ActiveCart {
  const cart = getOrCreateCart(sessionId);
  cart.items = [];
  cart.updatedAt = new Date().toISOString();
  return cart;
}

export function calculateCartSummary(cart: ActiveCart) {
  const totalItems = cart.items.reduce((acc, item) => acc + item.qty, 0);
  const subtotalMrp = cart.items.reduce((acc, item) => acc + item.mrp * item.qty, 0);
  const subtotalAbo = cart.items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalSavings = Math.max(0, subtotalMrp - subtotalAbo);

  return {
    itemsCount: totalItems,
    items: cart.items,
    subtotalMrp,
    subtotalAbo,
    totalSavings,
  };
}

export function createOrderFromCart(orderInput: {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity?: string;
  notes?: string;
  sessionId?: string;
}): { order?: Order; error?: string } {
  const sessionId = orderInput.sessionId || DEFAULT_SESSION;
  const cart = getOrCreateCart(sessionId);

  if (cart.items.length === 0) {
    return { error: 'Cannot create order: Cart is empty' };
  }

  const summary = calculateCartSummary(cart);
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

  const order: Order = {
    id: orderId,
    orderNumber: `NSQ-${Math.floor(100000 + Math.random() * 900000)}`,
    customerName: orderInput.customerName,
    customerPhone: orderInput.customerPhone,
    customerAddress: orderInput.customerAddress,
    customerCity: orderInput.customerCity,
    items: [...cart.items],
    subtotalMrp: summary.subtotalMrp,
    subtotalAbo: summary.subtotalAbo,
    totalSavings: summary.totalSavings,
    status: 'confirmed',
    notes: orderInput.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.unshift(order);
  clearCart(sessionId);

  return { order };
}

export function listOrders(limit: number = 20, status?: string): Order[] {
  let list = orders;
  if (status) {
    list = list.filter(o => o.status === status);
  }
  return list.slice(0, limit);
}

export function updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
  const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (order) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
  }
  return order;
}

export function createLead(leadInput: {
  name: string;
  phone: string;
  email?: string;
  healthGoal: string;
  notes?: string;
}): Lead {
  const lead: Lead = {
    id: `LEAD-${Date.now().toString(36).toUpperCase()}`,
    name: leadInput.name,
    phone: leadInput.phone,
    email: leadInput.email,
    healthGoal: leadInput.healthGoal,
    notes: leadInput.notes,
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  leads.unshift(lead);
  return lead;
}

export function listLeads(limit: number = 50): Lead[] {
  return leads.slice(0, limit);
}

// ICMR-NIN 2020 RDA Benchmark Knowledge Base for LLM Dosage Verification
export const ICMR_NIN_RDA_BENCHMARKS = [
  {
    nutrient: 'Protein',
    unit: 'g/day',
    adultMenRDA: '54.0 g/day (0.83g/kg)',
    adultWomenRDA: '46.0 g/day (0.83g/kg)',
    pregnancyRDA: '+9.5 g (2nd tri) / +22.0 g (3rd tri)',
    upperLimitUL: '2.0 g/kg/day',
    authority: 'ICMR-NIN 2020 RDA Table 2.1',
  },
  {
    nutrient: 'Elemental Calcium',
    unit: 'mg/day',
    adultMenRDA: '1,000 mg/day',
    adultWomenRDA: '1,000 mg/day',
    pregnancyRDA: '1,000 mg/day',
    upperLimitUL: '2,500 mg/day',
    authority: 'ICMR-NIN 2020 RDA Table 5.1',
  },
  {
    nutrient: 'Elemental Iron',
    unit: 'mg/day',
    adultMenRDA: '19.0 mg/day',
    adultWomenRDA: '29.0 mg/day (15mg post-menopause)',
    pregnancyRDA: '27.0 mg/day',
    upperLimitUL: '45.0 mg/day',
    authority: 'ICMR-NIN 2020 RDA Table 6.1',
  },
  {
    nutrient: 'Zinc',
    unit: 'mg/day',
    adultMenRDA: '17.0 mg/day',
    adultWomenRDA: '13.2 mg/day',
    pregnancyRDA: '14.5 mg/day',
    upperLimitUL: '40.0 mg/day',
    authority: 'ICMR-NIN 2020 RDA Table 6.4',
  },
  {
    nutrient: 'Vitamin C (Ascorbic Acid)',
    unit: 'mg/day',
    adultMenRDA: '80.0 mg/day',
    adultWomenRDA: '65.0 mg/day',
    pregnancyRDA: '80.0 mg/day',
    upperLimitUL: '2,000 mg/day',
    authority: 'ICMR-NIN 2020 RDA Table 4.3',
  },
  {
    nutrient: 'Vitamin D3 (Cholecalciferol)',
    unit: 'IU/day (mcg)',
    adultMenRDA: '600 IU (15 mcg/day)',
    adultWomenRDA: '600 IU (15 mcg/day)',
    pregnancyRDA: '600 IU (15 mcg/day)',
    upperLimitUL: '4,000 IU/day',
    authority: 'ICMR-NIN 2020 RDA Table 4.1',
  },
  {
    nutrient: 'EPA + DHA (Omega-3)',
    unit: 'mg/day',
    adultMenRDA: '250 – 500 mg/day',
    adultWomenRDA: '250 – 500 mg/day',
    pregnancyRDA: 'Min 200 mg DHA',
    upperLimitUL: '3,000 mg/day',
    authority: 'FSSAI 2022 & ICMR-NIN Dietary Fat Guidelines',
  },
];
