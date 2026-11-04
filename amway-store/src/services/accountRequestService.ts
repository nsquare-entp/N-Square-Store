import fs from 'fs';
import path from 'path';
import { AccountUpdateRequest } from '../types/user';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';

function getRequestsFilePath(): string {
  return getDataFilePath('account_requests.json');
}

export function getAllAccountRequests(): AccountUpdateRequest[] {
  const filePath = getRequestsFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.error('[AccountRequestService] Error reading account_requests.json:', e);
    }
  }
  return [];
}

export function saveAllAccountRequests(requests: AccountUpdateRequest[]): void {
  const filePath = getRequestsFilePath();
  try {
    atomicWriteJson(filePath, requests);
  } catch (e) {
    console.error('[AccountRequestService] Error saving account_requests.json:', e);
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
  return requests[idx];
}
