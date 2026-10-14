import { supabase } from './supabase';

/** Calls same-origin protected server APIs with the current Supabase access token. */
export async function serverApi(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase?.auth.getSession() || { data: { session: null } };
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(path, { ...init, headers, cache: 'no-store' });
}

export async function fetchOwnProfile() {
  const response = await serverApi('/api/me/profile');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.profile) throw new Error(payload.message || 'Could not load account profile.');
  return payload.profile;
}
