import { validateSessionToken } from '../services/adminAuthService';

/**
 * Verifies if an incoming Next.js API route Request contains a valid admin session token.
 * Checks both Authorization: Bearer <token> and x-admin-token headers.
 */
export function verifyAdminRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  let token = '';

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    token = request.headers.get('x-admin-token') || '';
  }

  if (!token) {
    return false;
  }

  return validateSessionToken(token);
}

