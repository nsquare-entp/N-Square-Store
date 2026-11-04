/**
 * Client-side fetch wrapper for admin requests.
 * Automatically attaches the authenticated admin session token
 * from sessionStorage into the request headers.
 */
export function adminFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('nsquare_admin_token') : null;
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set('x-admin-token', token);
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
}

