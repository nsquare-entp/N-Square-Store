import fs from 'fs';
import path from 'path';
import { AccountUpdateRequest } from '../types/user';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';
import { supabase, getSupabaseAdmin, isSupabaseConfigured } from '../utils/supabase';

declare global {
  // eslint-disable-next-line no-var
  var __nsquare_account_requests_cache__: AccountUpdateRequest[] | undefined;
}

let lastRequestsSyncTimestamp = 0;
const REQUESTS_SYNC_TTL_MS = 30 * 1000;
let isSyncingRequests = false;

function getRequestsFilePath(): string {
  return getDataFilePath('account_requests.json');
}

function mapRequestToRow(r: AccountUpdateRequest) {
  return {
    id: r.id,
    user_id: r.userId,
    user_name: r.userName,
    user_mobile: r.userMobile,
    request_type: r.requestType,
    message: r.message,
    requested_data: r.requestedData || {},
    status: r.status || 'OPEN',
    admin_notes: r.adminNotes || null,
    created_at: r.createdAt || new Date().toISOString(),
    resolved_at: r.resolvedAt || null,
  };
}

function mapRowToRequest(row: any): AccountUpdateRequest {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userMobile: row.user_mobile,
    requestType: row.request_type,
    message: row.message,
    requestedData: row.requested_data && typeof row.requested_data === 'object' ? row.requested_data : undefined,
    status: (row.status as 'OPEN' | 'RESOLVED' | 'REJECTED') || 'OPEN',
    adminNotes: row.admin_notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    resolvedAt: row.resolved_at || undefined,
  };
}

export async function syncAccountRequestsFromSupabase(): Promise<AccountUpdateRequest[]> {
  if (!isSupabaseConfigured) return getAllAccountRequests();
  try {
    const { data, error } = await supabase.from('account_requests').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return getAllAccountRequests();
    }
    const mapped = data.map(mapRowToRequest);
    globalThis.__nsquare_account_requests_cache__ = mapped;
    lastRequestsSyncTimestamp = Date.now();

    const filePath = getRequestsFilePath();
    atomicWriteJson(filePath, mapped);
    return mapped;
  } catch (err: any) {
    console.warn('[AccountRequestService] Supabase sync note:', err?.message || err);
    return getAllAccountRequests();
  }
}

export function getAllAccountRequests(forceReload = false): AccountUpdateRequest[] {
  if (!forceReload && globalThis.__nsquare_account_requests_cache__) {
    // SWR trigger
    const now = Date.now();
    if (isSupabaseConfigured && !isSyncingRequests && now - lastRequestsSyncTimestamp > REQUESTS_SYNC_TTL_MS) {
      isSyncingRequests = true;
      syncAccountRequestsFromSupabase().finally(() => {
        isSyncingRequests = false;
      });
    }
    return globalThis.__nsquare_account_requests_cache__;
  }

  const filePath = getRequestsFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        globalThis.__nsquare_account_requests_cache__ = parsed.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (e) {
      console.error('[AccountRequestService] Error reading account_requests.json:', e);
    }
  }

  if (!globalThis.__nsquare_account_requests_cache__) {
    globalThis.__nsquare_account_requests_cache__ = [];
  }

  // Trigger SWR sync
  const now = Date.now();
  if (isSupabaseConfigured && !isSyncingRequests && now - lastRequestsSyncTimestamp > REQUESTS_SYNC_TTL_MS) {
    isSyncingRequests = true;
    syncAccountRequestsFromSupabase().finally(() => {
      isSyncingRequests = false;
    });
  }

  return globalThis.__nsquare_account_requests_cache__;
}

export function saveAllAccountRequests(requests: AccountUpdateRequest[]): void {
  globalThis.__nsquare_account_requests_cache__ = [...requests];
  const filePath = getRequestsFilePath();
  try {
    atomicWriteJson(filePath, requests);
  } catch (e: any) {
    if (e?.code !== 'EROFS' && e?.code !== 'EACCES') {
      console.error('[AccountRequestService] Error saving account_requests.json:', e);
    }
  }

  if (isSupabaseConfigured && requests.length > 0) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        const rows = requests.map(mapRequestToRow);
        await admin.from('account_requests').upsert(rows, { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[AccountRequestService] Supabase sync error on saveAllAccountRequests:', e?.message || e);
      }
    })();
  }
}

export function deleteAccountRequestsByUserId(userId: string): void {
  if (!userId) return;
  const requests = getAllAccountRequests();
  const filtered = requests.filter((r) => r.userId !== userId && r.userId?.trim().toLowerCase() !== userId.trim().toLowerCase());
  if (filtered.length < requests.length) {
    saveAllAccountRequests(filtered);

    if (isSupabaseConfigured) {
      (async () => {
        try {
          const admin = getSupabaseAdmin();
          await admin.from('account_requests').delete().eq('user_id', userId);
        } catch (e: any) {
          console.warn('[AccountRequestService] Supabase sync error on deleteAccountRequestsByUserId:', e?.message || e);
        }
      })();
    }
  }
}

export function getRequestsByUserId(userId: string): AccountUpdateRequest[] {
  const requests = getAllAccountRequests();
  return requests.filter((r) => r.userId === userId);
}

export function createAccountRequest(data: {
  userId: string;
  userName: string;
  userMobile: string;
  requestType: AccountUpdateRequest['requestType'];
  message: string;
  requestedData?: AccountUpdateRequest['requestedData'];
}): AccountUpdateRequest {
  const requests = getAllAccountRequests();
  const id = `REQ-${Date.now().toString(36).toUpperCase()}`;

  const newReq: AccountUpdateRequest = {
    id,
    userId: data.userId,
    userName: data.userName,
    userMobile: data.userMobile,
    requestType: data.requestType,
    message: data.message.trim(),
    requestedData: data.requestedData,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  requests.unshift(newReq);
  saveAllAccountRequests(requests);

  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('account_requests').upsert(mapRequestToRow(newReq), { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[AccountRequestService] Supabase sync error on createAccountRequest:', e?.message || e);
      }
    })();
  }

  return newReq;
}

export function resolveAccountRequest(id: string, status: 'RESOLVED' | 'REJECTED', adminNotes?: string): AccountUpdateRequest | null {
  const requests = getAllAccountRequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx < 0) return null;

  requests[idx].status = status;
  if (adminNotes) requests[idx].adminNotes = adminNotes;
  requests[idx].resolvedAt = new Date().toISOString();

  saveAllAccountRequests(requests);

  if (isSupabaseConfigured) {
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        await admin.from('account_requests').upsert(mapRequestToRow(requests[idx]), { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[AccountRequestService] Supabase sync error on resolveAccountRequest:', e?.message || e);
      }
    })();
  }

  return requests[idx];
}
