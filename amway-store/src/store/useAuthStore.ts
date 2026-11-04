import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserAccount } from '../types/user';

interface AuthStore {
  user: UserAccount | null;
  isAuthenticated: boolean;
  login: (user: UserAccount) => void;
  logout: () => void;
  updateUserCart: (cart: any[]) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (user) => {
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('amway_auth_status');
        }
      },

      updateUserCart: (cart) => {
        const currentUser = get().user;
        if (!currentUser) return;
        const updated = { ...currentUser, cart };
        set({ user: updated });

        // Fire-and-forget sync to backend database
        fetch(`/api/users/${encodeURIComponent(currentUser.id)}/cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart }),
        }).catch((e) => console.log('Cart background sync notice:', e));
      },
    }),
    {
      name: 'nsquare_customer_auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
