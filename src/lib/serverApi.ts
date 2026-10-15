import { getSupabase, getIsSupabaseConfigured, initSupabase } from './supabase';

/** Same-origin protected API calls with the current Supabase access token. Never attach service-role keys. */
export async function serverApi(path: string, init: RequestInit = {}): Promise<Response> {
  if (!path.startsWith('/')) {
    throw new Error('serverApi path must be root-relative (e.g. /api/me/profile)');
  }
  await initSupabase();
  const supabase = getSupabase();
  if (!getIsSupabaseConfigured() || !supabase) {
    return new Response(JSON.stringify({ success: false, message: 'Supabase is not configured in this environment.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body != null && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(path, { ...init, headers, cache: 'no-store', credentials: 'same-origin' });
}

export async function fetchOwnProfile() {
  const response = await serverApi('/api/me/profile');
  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok || !(payload as { profile?: unknown }).profile) {
    const message =
      (payload as { message?: string }).message ||
      (response.status === 401 ? 'Session expired. Sign in again.' : 'Could not load account profile.');
    throw new Error(message);
  }
  return (payload as { profile: Record<string, unknown> }).profile;
}
