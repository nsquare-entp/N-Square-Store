import fs from 'fs';
import path from 'path';
import { UserAccount } from '../types/user';
import { CartItem } from '../store/useCartStore';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';

function getUsersFilePath(): string {
  return getDataFilePath('users.json');
}

let memoryUsers: UserAccount[] | null = null;

export function getAllUsers(): UserAccount[] {
  if (memoryUsers) {
    return memoryUsers;
  }
  const filePath = getUsersFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        memoryUsers = parsed;
        return memoryUsers;
      }
    } catch (e) {
      console.error('[UserService] Error reading users.json:', e);
    }
  }
  memoryUsers = [];
  return memoryUsers;
}

export function saveAllUsers(users: UserAccount[]): void {
  memoryUsers = users;
  const filePath = getUsersFilePath();
  try {
    atomicWriteJson(filePath, users);
  } catch (e) {
    console.error('[UserService] Error saving users.json:', e);
  }
}

export function getUserById(id: string): UserAccount | undefined {
  const users = getAllUsers();
  return users.find((u) => u.id === id);
}

export function getUserByLoginKey(loginKey: string): UserAccount | undefined {
  const users = getAllUsers();
  const cleaned = loginKey.trim().toLowerCase();
  const digitsOnly = cleaned.replace(/\D/g, '');

  return users.find((u) => {
    const uMobileDigits = (u.mobile || '').replace(/\D/g, '');
    const mobileMatch =
      (digitsOnly.length >= 10 && uMobileDigits.slice(-10) === digitsOnly.slice(-10)) ||
      (digitsOnly.length > 0 && uMobileDigits === digitsOnly);
    const emailMatch = u.email && u.email.toLowerCase() === cleaned;
    const idMatch = u.id.toLowerCase() === cleaned;
    return mobileMatch || emailMatch || idMatch;
  });
}

export function createUser(data: {
  mobile: string;
  name: string;
  password?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  notes?: string;
  inquiryId?: string;
  cart?: CartItem[];
  status?: 'ACTIVE' | 'SUSPENDED';
}): UserAccount {
  const users = getAllUsers();
  const id = `USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Default custom password if not provided by admin
  const password = data.password && data.password.trim() ? data.password.trim() : 'Nsquare@123';

  const newUser: UserAccount = {
    id,
    mobile: data.mobile.trim(),
    email: data.email?.trim() || '',
    name: data.name.trim(),
    password,
    address: data.address || {},
    inquiryId: data.inquiryId,
    cart: data.cart || [],
    status: data.status || 'ACTIVE',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.unshift(newUser);
  saveAllUsers(users);
  return newUser;
}

export function updateUser(id: string, updates: Partial<UserAccount>): UserAccount | null {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;

  const updated: UserAccount = {
    ...users[idx],
    ...updates,
    id: users[idx].id, // protect ID
    updatedAt: new Date().toISOString(),
  };

  users[idx] = updated;
  saveAllUsers(users);
  return updated;
}

export function deleteUser(id: string): boolean {
  const users = getAllUsers();
  const initialLength = users.length;
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length < initialLength) {
    saveAllUsers(filtered);
    return true;
  }
  return false;
}

export function syncUserCart(userId: string, cartItems: CartItem[]): boolean {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return false;

  user.cart = cartItems;
  user.updatedAt = new Date().toISOString();
  saveAllUsers(users);
  return true;
}
