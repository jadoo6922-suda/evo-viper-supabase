import type { Express } from 'express';

export function loadServerEnv() {
  // Intentionally lightweight — Render/Cloudflare inject env at runtime.
  return {
    port: Number(process.env.PORT || 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProd: (process.env.NODE_ENV || '').toLowerCase() === 'production',
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    adminGateEmail: String(process.env.ADMIN_GATE_EMAIL || 'jadoo.6922@gmail.com').trim().toLowerCase(),
    adminGateCronSecret: String(process.env.ADMIN_GATE_CRON_SECRET || ''),
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
    publicAppUrl: process.env.PUBLIC_APP_URL || process.env.APP_URL || '',
  };
}

export type ServerEnv = ReturnType<typeof loadServerEnv>;

export function collectAllowedOrigins(): Set<string> {
  return new Set(
    [process.env.PUBLIC_APP_URL, process.env.APP_URL, process.env.RENDER_EXTERNAL_URL]
      .filter(Boolean)
      .map((u) => String(u).replace(/\/$/, '')),
  );
}
