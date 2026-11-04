import fs from 'fs';
import path from 'path';
import { CustomerOrder } from '../types/user';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';

function getOrdersFilePath(): string {
  return getDataFilePath('orders.json');
}

let memoryOrders: CustomerOrder[] | null = null;

export function getAllOrders(): CustomerOrder[] {
  if (memoryOrders) {
    return memoryOrders;
  }
  const filePath = getOrdersFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        memoryOrders = parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return memoryOrders;
      }
    } catch (e) {
      console.error('[OrderService] Error reading orders.json:', e);
    }
  }
  memoryOrders = [];
  return memoryOrders;
}

export function saveAllOrders(orders: CustomerOrder[]): void {
  memoryOrders = orders;
  const filePath = getOrdersFilePath();
  try {
    atomicWriteJson(filePath, orders);
  } catch (e) {
    console.error('[OrderService] Error saving orders.json:', e);
  }
}

export function getOrdersByUserId(userId: string): CustomerOrder[] {
  const orders = getAllOrders();
  return orders.filter((o) => o.userId === userId);
}

export function createOrder(data: Omit<CustomerOrder, 'id' | 'createdAt' | 'updatedAt'>): CustomerOrder {
  const orders = getAllOrders();
  const id = `ORD-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

  const discount = Number(data.discountAmount) || 0;
  const delivery = Number(data.deliveryCharge) || 0;
  const finalPayable = data.finalPayableAmount ?? Math.max(0, data.totalAmount - discount + delivery);

  const newOrder: CustomerOrder = {
    ...data,
    id,
    status: data.status || 'REQUESTED',
    discountAmount: discount,
    deliveryCharge: delivery,
    finalPayableAmount: finalPayable,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  saveAllOrders(orders);
  return newOrder;
}

export function updateOrder(id: string, updates: Partial<CustomerOrder>): CustomerOrder | null {
  const orders = getAllOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx < 0) return null;

  const current = orders[idx];
  const total = updates.totalAmount !== undefined ? Number(updates.totalAmount) : current.totalAmount;
  const discount = updates.discountAmount !== undefined ? Number(updates.discountAmount) : (Number(current.discountAmount) || 0);
  const delivery = updates.deliveryCharge !== undefined ? Number(updates.deliveryCharge) : (Number(current.deliveryCharge) || 0);

  const finalPayable = updates.finalPayableAmount !== undefined
    ? Number(updates.finalPayableAmount)
    : Math.max(0, total - discount + delivery);

  const updated: CustomerOrder = {
    ...current,
    ...updates,
    discountAmount: discount,
    deliveryCharge: delivery,
    finalPayableAmount: finalPayable,
    id: current.id,
    updatedAt: new Date().toISOString(),
  };

  orders[idx] = updated;
  saveAllOrders(orders);
  return updated;
}

export function deleteOrder(id: string): boolean {
  const orders = getAllOrders();
  const initialLength = orders.length;
  const filtered = orders.filter((o) => o.id !== id);
  if (filtered.length < initialLength) {
    saveAllOrders(filtered);
    return true;
  }
  return false;
}
