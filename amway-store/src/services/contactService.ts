import fs from 'fs';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';
import { supabase, getSupabaseAdmin, isSupabaseConfigured } from '../utils/supabase';

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

let lastContactSyncTimestamp = 0;
const CONTACT_SYNC_TTL_MS = 60 * 1000;
let isSyncingContact = false;

function getContactFilePath(): string {
  return getDataFilePath('contact_settings.json');
}

export async function syncContactFromSupabase(): Promise<ContactSettings | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('contact_settings').select('*').eq('id', 'primary').single();
    if (error || !data) return null;

    const mapped: ContactSettings = {
      storeName: data.store_name || DEFAULT_SETTINGS.storeName,
      tagline: data.tagline || DEFAULT_SETTINGS.tagline,
      whatsappNumber: data.whatsapp_number || DEFAULT_SETTINGS.whatsappNumber,
      whatsappDisplayText: data.whatsapp_display_text || DEFAULT_SETTINGS.whatsappDisplayText,
      instagramUrl: data.instagram_url || DEFAULT_SETTINGS.instagramUrl,
      instagramHandle: data.instagram_handle || DEFAULT_SETTINGS.instagramHandle,
      linkedinUrl: data.linkedin_url || DEFAULT_SETTINGS.linkedinUrl,
      linkedinHandle: data.linkedin_handle || DEFAULT_SETTINGS.linkedinHandle,
      youtubeUrl: data.youtube_url || DEFAULT_SETTINGS.youtubeUrl,
      youtubeHandle: data.youtube_handle || DEFAULT_SETTINGS.youtubeHandle,
      supportPhone: data.support_phone || DEFAULT_SETTINGS.supportPhone,
      supportEmail: data.support_email || DEFAULT_SETTINGS.supportEmail,
      officeAddress: data.office_address || DEFAULT_SETTINGS.officeAddress,
      supportHours: data.support_hours || DEFAULT_SETTINGS.supportHours,
      welcomeMessage: data.welcome_message || DEFAULT_SETTINGS.welcomeMessage,
    };

    globalThis.__nsquare_contact_cache__ = mapped;
    lastContactSyncTimestamp = Date.now();

    const filePath = getContactFilePath();
    atomicWriteJson(filePath, mapped);

    return mapped;
  } catch (err: any) {
    console.warn('[ContactService] Supabase sync note:', err?.message || err);
    return null;
  }
}

export function getContactSettings(): ContactSettings {
  if (!globalThis.__nsquare_contact_cache__) {
    const filePath = getContactFilePath();
    try {
      if (!fs.existsSync(filePath)) {
        atomicWriteJson(filePath, DEFAULT_SETTINGS);
        globalThis.__nsquare_contact_cache__ = DEFAULT_SETTINGS;
      } else {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        globalThis.__nsquare_contact_cache__ = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      globalThis.__nsquare_contact_cache__ = DEFAULT_SETTINGS;
    }
  }

  // SWR background refresh from Supabase
  const now = Date.now();
  if (isSupabaseConfigured && !isSyncingContact && now - lastContactSyncTimestamp > CONTACT_SYNC_TTL_MS) {
    isSyncingContact = true;
    syncContactFromSupabase().finally(() => {
      isSyncingContact = false;
    });
  }

  return globalThis.__nsquare_contact_cache__ || DEFAULT_SETTINGS;
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

  // Asynchronously sync to Supabase
  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('contact_settings').upsert(
          {
            id: 'primary',
            store_name: updated.storeName,
            tagline: updated.tagline,
            whatsapp_number: updated.whatsappNumber,
            whatsapp_display_text: updated.whatsappDisplayText,
            instagram_url: updated.instagramUrl,
            instagram_handle: updated.instagramHandle,
            linkedin_url: updated.linkedinUrl,
            linkedin_handle: updated.linkedinHandle,
            youtube_url: updated.youtubeUrl,
            youtube_handle: updated.youtubeHandle,
            support_phone: updated.supportPhone,
            support_email: updated.supportEmail,
            office_address: updated.officeAddress,
            support_hours: updated.supportHours,
            welcome_message: updated.welcomeMessage,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch (e: any) {
        console.warn('[ContactService] Supabase sync note:', e?.message || e);
      }
    })();
  }

  return updated;
}
