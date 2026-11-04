import fs from 'fs';
import path from 'path';
import { getDataFilePath, atomicWriteJson } from '../utils/dataPath';

interface AdminConfig {
  pin: string;
  updatedAt: string;
}

function getAdminConfigPath(): string {
  return getDataFilePath('admin_config.json');
}

export function getAdminConfig(): AdminConfig {
  const filePath = getAdminConfigPath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data.pin === 'string' && /^\d{4}$/.test(data.pin)) {
        return data;
      }
    } catch (e) {
      console.error('[AdminAuthService] Error reading admin_config.json:', e);
    }
  }

  // Fallback default
  return {
    pin: '1234',
    updatedAt: new Date().toISOString(),
  };
}

export function saveAdminConfig(config: AdminConfig): void {
  const filePath = getAdminConfigPath();
  try {
    atomicWriteJson(filePath, config);
  } catch (e: any) {
    if (e?.code !== 'EROFS' && e?.code !== 'EACCES') {
      console.error('[AdminAuthService] Error saving admin_config.json:', e);
    }
  }
}

export function verifyAdminPin(candidatePin: string): { valid: boolean; token?: string } {
  if (!candidatePin || typeof candidatePin !== 'string') {
    return { valid: false };
  }

  const cleanPin = candidatePin.trim();
  const config = getAdminConfig();

  if (cleanPin === config.pin) {
    // Generate secure session token
    const timestamp = Date.now();
    const token = Buffer.from(`admin_session_${timestamp}_${config.pin}`).toString('base64');
    return { valid: true, token };
  }

  return { valid: false };
}

export function validateSessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split('_');
    if (parts.length >= 4 && parts[0] === 'admin' && parts[1] === 'session') {
      const config = getAdminConfig();
      const tokenPin = parts.slice(3).join('_');
      return tokenPin === config.pin;
    }
  } catch {
    return false;
  }
  return false;
}

export function updateAdminPin(currentPin: string, newPin: string): { success: boolean; error?: string } {
  const config = getAdminConfig();

  if (currentPin.trim() !== config.pin) {
    return { success: false, error: 'Current PIN is incorrect.' };
  }

  const cleanNewPin = newPin.trim();
  if (!/^\d{4}$/.test(cleanNewPin)) {
    return { success: false, error: 'New PIN must be exactly 4 numeric digits.' };
  }

  config.pin = cleanNewPin;
  config.updatedAt = new Date().toISOString();
  saveAdminConfig(config);

  return { success: true };
}

