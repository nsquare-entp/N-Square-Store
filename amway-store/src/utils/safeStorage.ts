import { StateStorage } from 'zustand/middleware';

/**
 * Universal safe browser localStorage wrapper.
 * Prevents Node.js 22 ExperimentalWarning: "localStorage is not available because --localstorage-file was not provided"
 * by avoiding direct references to globalThis.localStorage during SSR on Vercel/Node.
 */
export const safeZustandStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(name, value);
    } catch {}
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }
    try {
      window.localStorage.removeItem(name);
    } catch {}
  },
};

/**
 * Safe client-side localStorage access helper.
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },
};

