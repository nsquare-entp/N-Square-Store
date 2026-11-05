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
  youtubeUrl?: string;
  youtubeHandle?: string;
  supportPhone: string;
  supportEmail: string;
  officeAddress: string;
  supportHours: string;
  welcomeMessage: string;
}

const DEFAULT_SETTINGS: ContactSettings = {
  storeName: 'N-Square Official',
  tagline: 'Authorized Amway Direct Selling Partner • Evidence-Based Wellness',
  whatsappNumber: '919876543210',
  whatsappDisplayText: '+91 98765 43210',
  instagramUrl: 'https://www.instagram.com/n_square_official/',
  instagramHandle: '@n_square_official',
  linkedinUrl: 'https://www.linkedin.com/company/n-square-official/',
  linkedinHandle: 'N-Square Official',
  youtubeUrl: 'https://www.youtube.com/@N_Square_Official',
  youtubeHandle: '@N_Square_Official',
  supportPhone: '+91 98765 43210',
  supportEmail: 'care@nsquareofficial.com',
  officeAddress: 'Authorized Amway Direct Seller Regional Fulfillment, Bengaluru, Karnataka, India',
  supportHours: 'Monday – Sunday: 9:00 AM – 9:00 PM IST',
  welcomeMessage: 'Have questions about authentic Amway nutrition, wellness, beauty, or personal care essentials? Connect with our dedicated team across any of our official channels.',
};

declare global {
  // eslint-disable-next-line no-var
  var __nsquare_contact_cache__: ContactSettings | undefined;
}

function getContactFilePath(): string {
  return getDataFilePath('contact_settings.json');
}

export function getContactSettings(): ContactSettings {
  if (globalThis.__nsquare_contact_cache__) {
    return globalThis.__nsquare_contact_cache__;
  }

  const filePath = getContactFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      atomicWriteJson(filePath, DEFAULT_SETTINGS);
      globalThis.__nsquare_contact_cache__ = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    globalThis.__nsquare_contact_cache__ = merged;
    return merged;
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

  globalThis.__nsquare_contact_cache__ = updated;

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
