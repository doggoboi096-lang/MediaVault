/**
 * api.ts — fetch wrapper for the MediaVault API.
 * The session travels in the httpOnly mv_session cookie (same origin), so no token handling here.
 * Any 401 tells the app to show the sign-in screen again.
 */

export const UNAUTHORIZED_EVENT = 'mv:unauthorized';

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, { credentials: 'same-origin', ...init });
  if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  return res;
}
