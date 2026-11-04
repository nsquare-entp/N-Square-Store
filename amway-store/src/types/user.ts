import { CartItem } from '../store/useCartStore';

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface UserAccount {
  id: string; // e.g. "USR-1001"
  mobile: string; // primary login key
  email?: string;
  name: string;
  password: string; // custom password set by admin
  address?: UserAddress;
  inquiryId?: string; // original lead inquiry if converted
  cart: CartItem[]; // synced active cart items
  status: 'ACTIVE' | 'SUSPENDED';
  notes?: string; // admin verification notes
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface OrderItem {
  id: string;
  sku?: string;
  name: string;
  price: number;
  mrp?: number;
  qty: number;
  variant?: string;
  image?: string;
}

export interface CustomerOrder {
  id: string; // e.g. "ORD-2026-1001"
  userId: string;
  userName: string;
  userMobile: string;
  userEmail?: string;
  shippingAddress: string;
  items: OrderItem[];
  totalAmount: number; // Subtotal of items at listed discounted price
  totalMrp?: number;
  savings?: number;
  discountAmount?: number; // Admin custom discount
  discountNote?: string;
  deliveryCharge?: number; // Admin custom delivery or additional charge
  deliveryChargeNote?: string; // Note/description for delivery charge
  finalPayableAmount?: number; // Final payable amount (totalAmount - discountAmount + deliveryCharge)
  status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'PENDING' | 'CONFIRMED';
  paymentStatus: 'PAID' | 'COD' | 'PENDING';
  paymentMethod?: 'UPI' | 'NET_BANKING' | 'CARD' | 'COD' | 'CASH';
  paymentRefNumber?: string; // UTR or Ref number
  paidAt?: string;
  invoiceNumber?: string; // e.g. "INV-2026-1042"
  invoiceDate?: string;
  invoiceUrl?: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  deliveredAt?: string;
  orderNotes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountUpdateRequest {
  id: string; // e.g. "REQ-1001"
  userId: string;
  userName: string;
  userMobile: string;
  requestType: 'PROFILE_UPDATE' | 'ADDRESS_CHANGE' | 'PASSWORD_RESET' | 'GENERAL_INQUIRY';
  message: string;
  requestedData?: {
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    profile?: {
      name?: string;
      mobile?: string;
      email?: string;
    };
    newPassword?: string;
  };
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}
