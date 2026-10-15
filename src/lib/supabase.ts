import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/**
 * Detect accidental service_role JWT in the browser bundle.
 * service_role must never be shipped as VITE_SUPABASE_ANON_KEY.
 */
function isServiceRoleJwt(key: string): boolean {
  try {
    const part = key.split('.')[1];
    if (!part) return false;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { role?: string };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

const urlOk = Boolean(supabaseUrl && isValidHttpUrl(supabaseUrl));
const keyOk = Boolean(supabaseAnonKey && supabaseAnonKey.length > 20 && !isServiceRoleJwt(supabaseAnonKey));

/**
 * Public browser client only. Never place a Supabase service-role/secret key in VITE_* variables.
 * Protected data must go through same-origin `/api/*` routes with the user access token.
 */
export const isSupabaseConfigured = Boolean(urlOk && keyOk);

export const supabaseConfigError: string | null = !urlOk
  ? 'VITE_SUPABASE_URL is missing or invalid.'
  : !keyOk
    ? supabaseAnonKey && isServiceRoleJwt(supabaseAnonKey)
      ? 'Refusing to start: VITE_SUPABASE_ANON_KEY looks like a service_role key. Use the anon/publishable key only.'
      : 'VITE_SUPABASE_ANON_KEY is missing or invalid.'
    : null;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

if (supabaseConfigError && import.meta.env.DEV) {
  console.error('[Supabase]', supabaseConfigError);
} else if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info('[Supabase] Not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}
