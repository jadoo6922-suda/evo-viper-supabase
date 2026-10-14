import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Public browser client only. Never place a Supabase service-role/secret key in VITE_* variables.
 * All application database access should use Supabase clients or authenticated server routes.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info('[Supabase] Not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}
