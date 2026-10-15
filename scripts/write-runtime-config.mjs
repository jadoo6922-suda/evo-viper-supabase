/**
 * Writes public/runtime-config.json for static hosts (Cloudflare Workers/Pages)
 * where Vite may not have received VITE_* at build, and /api/* is not a Node server.
 * Only anon/publishable values — never service_role / sb_secret_*.
 */
import fs from 'node:fs';
import path from 'node:path';

const url = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .trim()
  .replace(/\/$/, '');
const key = String(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

const outDir = path.resolve('public');
const outFile = path.join(outDir, 'runtime-config.json');

function isSecret(k) {
  if (k.startsWith('sb_secret_')) return true;
  try {
    const part = k.split('.')[1];
    if (!part) return false;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json)?.role === 'service_role';
  } catch {
    return false;
  }
}

if (!url || !key) {
  console.warn('[runtime-config] SKIP: set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (or SUPABASE_URL + SUPABASE_ANON_KEY) at build time.');
  process.exit(0);
}
if (isSecret(key)) {
  console.error('[runtime-config] REFUSING to write service-role/secret key into public runtime-config.json');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key }, null, 0) + '\n', 'utf8');
console.log('[runtime-config] wrote public/runtime-config.json');
