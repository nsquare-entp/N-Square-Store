import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

export interface CartItem {
  id: string;
  sku?: string;
  name: string;
  price: number;
  mrp?: number;
  image: string;
  qty: number;
  variant?: string;
}

interface CartStore {
  items: CartItem[];
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  addItem: (product: { id: string; sku?: string; name: string; price: number; mrp?: number; image: string; variant?: string; qty?: number }) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCartItems: (items: CartItem[]) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getTotalMrp: () => number;
  getTotalSavings: () => number;
}

function syncToAuthIfLoggedIn(items: CartItem[]) {
  try {
    const auth = useAuthStore.getState();
    if (auth.isAuthenticated && auth.user) {
      auth.updateUserCart(items);
    }
  } catch (e) {
    // ignore
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isSidebarOpen: false,

      openSidebar: () => set({ isSidebarOpen: true }),
      closeSidebar: () => set({ isSidebarOpen: false }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      addItem: (product) => {
        let updatedItems: CartItem[] = [];
        const quantityToAdd = product.qty && product.qty > 0 ? product.qty : 1;
        // Unique line ID per variant / SKU
        const lineId = product.sku
          ? product.sku
          : product.variant
          ? `${product.id}-${product.variant.replace(/\s+/g, '')}`
          : product.id;

        const { qty: _unusedQty, ...cleanProduct } = product;
        const itemToAdd = { ...cleanProduct, id: lineId };

        set((state) => {
          const existingItem = state.items.find((item) => item.id === lineId);
          if (existingItem) {
            updatedItems = state.items.map((item) =>
              item.id === lineId ? { ...item, qty: item.qty + quantityToAdd } : item
            );
          } else {
            updatedItems = [...state.items, { ...itemToAdd, qty: quantityToAdd }];
          }
          return {
            isSidebarOpen: true,
            items: updatedItems,
          };
        });
        syncToAuthIfLoggedIn(updatedItems);
      },

      updateQty: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id);
          return;
        }
        let updatedItems: CartItem[] = [];
        set((state) => {
          updatedItems = state.items.map((item) =>
            item.id === id ? { ...item, qty } : item
          );
          return { items: updatedItems };
        });
        syncToAuthIfLoggedIn(updatedItems);
      },

      removeItem: (id) => {
        let updatedItems: CartItem[] = [];
        set((state) => {
          updatedItems = state.items.filter((item) => item.id !== id);
          return { items: updatedItems };
        });
        syncToAuthIfLoggedIn(updatedItems);
      },

      clearCart: () => {
        set({ items: [] });
        syncToAuthIfLoggedIn([]);
      },

      setCartItems: (items) => {
        set({ items });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.qty, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.qty, 0);
      },

      getTotalMrp: () => {
        return get().items.reduce((total, item) => total + (item.mrp || item.price) * item.qty, 0);
      },

      getTotalSavings: () => {
        const mrp = get().getTotalMrp();
        const actual = get().getTotalPrice();
        return Math.max(0, mrp - actual);
      },
    }),
    {
      name: 'nsquare_customer_cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
