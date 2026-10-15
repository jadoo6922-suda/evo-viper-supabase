import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Public browser client only.
 * Never place SUPABASE_SERVICE_ROLE_KEY (or sb_secret_*) in VITE_* or the SPA.
 *
 * Config resolution order:
 * 1) VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (build-time — Vite embeds these)
 * 2) GET /api/public-config from the same origin (runtime — Cloudflare/Render env)
 */

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
let supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

function isServiceRoleKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
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

function evaluateConfig(url: string, key: string): { ok: boolean; error: string | null } {
  if (!url || !isValidHttpUrl(url)) {
    return { ok: false, error: 'Supabase URL is missing or invalid.' };
  }
  if (!key || key.length < 20) {
    return { ok: false, error: 'Supabase anon/publishable key is missing or invalid.' };
  }
  if (isServiceRoleKey(key)) {
    return {
      ok: false,
      error: 'Refusing service-role/secret key in the browser. Use the anon or publishable key only.',
    };
  }
  return { ok: true, error: null };
}

let client: SupabaseClient | null = null;
let initPromise: Promise<boolean> | null = null;
let lastError: string | null = null;

function applyConfig(url: string, key: string): boolean {
  const check = evaluateConfig(url, key);
  lastError = check.error;
  if (!check.ok) {
    client = null;
    return false;
  }
  supabaseUrl = url.replace(/\/$/, '');
  supabaseAnonKey = key;
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return true;
}

// Try build-time env immediately (works when Vite had VITE_* at build).
if (supabaseUrl && supabaseAnonKey) {
  applyConfig(supabaseUrl, supabaseAnonKey);
}

/** True when a safe browser client exists. */
export function getIsSupabaseConfigured(): boolean {
  return client != null;
}

/** Reflects current client; prefer getIsSupabaseConfigured() in new code. */
export function isSupabaseConfigured(): boolean {
  return client != null;
}

export function getSupabaseConfigError(): string | null {
  return lastError;
}

/** @deprecated use getSupabaseConfigError */
export function supabaseConfigError(): string | null {
  return lastError;
}

/**
 * Live client reference. Prefer getSupabase() after await initSupabase().
 * Mutable binding so existing `import { supabase }` keeps working after init.
 */
export let supabase: SupabaseClient | null = client;

export function getSupabase(): SupabaseClient | null {
  return client;
}

/**
 * Ensure Supabase browser client is ready.
 * Fetches /api/public-config when build-time VITE_* vars were not embedded.
 */
export async function initSupabase(): Promise<boolean> {
  if (client) {
    supabase = client;
    return true;
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1) Build-time already tried above; retry if env appeared somehow
    const builtUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
    const builtKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
    if (builtUrl && builtKey && applyConfig(builtUrl, builtKey)) {
      supabase = client;
      return true;
    }

    // 2) Static runtime-config.json (Cloudflare Workers/Pages static deploy)
    try {
      const res = await fetch('/runtime-config.json', { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('json')) {
        const body = (await res.json()) as { supabaseUrl?: string; supabaseAnonKey?: string };
        if (body.supabaseUrl && body.supabaseAnonKey && applyConfig(body.supabaseUrl, body.supabaseAnonKey)) {
          supabase = client;
          return true;
        }
      }
    } catch {
      /* continue */
    }

    // 3) Runtime public config from Node host (Render / full server)
    try {
      const res = await fetch('/api/public-config', { cache: 'no-store', credentials: 'same-origin' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('json')) {
        const body = (await res.json()) as { supabaseUrl?: string; supabaseAnonKey?: string; error?: string };
        if (body.supabaseUrl && body.supabaseAnonKey && applyConfig(body.supabaseUrl, body.supabaseAnonKey)) {
          supabase = client;
          return true;
        }
        if (body.error) lastError = body.error;
      } else {
        lastError =
          lastError ||
          'Supabase public config missing. On Cloudflare set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (or SUPABASE_URL + SUPABASE_ANON_KEY) as Build variables and redeploy.';
      }
    } catch {
      lastError =
        lastError ||
        'Network error loading Supabase public config.';
    }

    supabase = client;
    return client != null;
  })();

  return initPromise;
}
