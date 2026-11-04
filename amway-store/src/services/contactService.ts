import fs from 'fs';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';

export interface ContactSettings {
  storeName: string;
  tagline: string;
  whatsappNumber: string;
  whatsappDisplayText: string;
  instagramUrl: string;
  instagramHandle: string;
  linkedinUrl: string;
  linkedinHandle: string;
  supportPhone: string;
  supportEmail: string;
  officeAddress: string;
  supportHours: string;
  welcomeMessage: string;
}

const DEFAULT_SETTINGS: ContactSettings = {
  storeName: 'N-Square Store',
  tagline: 'Amway Direct Selling Partner',
  whatsappNumber: '919876543210',
  whatsappDisplayText: '+91 98765 43210',
  instagramUrl: 'https://www.instagram.com/nsquarestore',
  instagramHandle: '@nsquarestore',
  linkedinUrl: 'https://www.linkedin.com/company/nsquarestore',
  linkedinHandle: 'N-Square Store',
  supportPhone: '+91 98765 43210',
  supportEmail: 'care@nsquarestore.com',
  officeAddress: 'Authorized Amway Direct Seller Regional Fulfillment, Bengaluru, Karnataka, India',
  supportHours: 'Monday – Sunday: 9:00 AM – 9:00 PM IST',
  welcomeMessage: 'Have questions about authentic Amway nutrition, wellness, beauty, or personal care essentials? Connect with our dedicated team across any of our official channels.',
};

function getContactFilePath(): string {
  return getDataFilePath('contact_settings.json');
}

export function getContactSettings(): ContactSettings {
  const filePath = getContactFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      atomicWriteJson(filePath, DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Error reading contact_settings.json:', err);
    return DEFAULT_SETTINGS;
  }
}

export function updateContactSettings(updates: Partial<ContactSettings>): ContactSettings {
  const current = getContactSettings();
  const updated: ContactSettings = {
    ...current,
    ...updates,
  };

  const filePath = getContactFilePath();
  try {
    atomicWriteJson(filePath, updated);
  } catch (err: any) {
    if (err?.code !== 'EROFS' && err?.code !== 'EACCES') {
      console.error('Error saving contact_settings.json:', err);
    }
  }

  return updated;
}

