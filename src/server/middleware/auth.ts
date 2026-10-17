import type { Request } from 'express';
import { getSupabaseAdmin } from '../config/supabase.js';
import { OWN_PROFILE_COLUMNS } from '../lib/validators.js';

export async function verifySupabaseToken(token: string) {
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid Supabase access token');
  let claims: any = {};
  try {
    claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid Supabase access token');
  }
  try {
    const { data: security, error: securityError } = await getSupabaseAdmin()
      .from('store_security_profiles')
      .select('session_revoked_at')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (
      !securityError &&
      security?.session_revoked_at &&
      Number(claims.iat || 0) <= Math.floor(new Date(security.session_revoked_at).getTime() / 1000)
    ) {
      throw new Error('session_revoked');
    }
    if (securityError) {
      console.warn('[auth] store_security_profiles unavailable; skipping revocation check:', securityError.message);
    }
  } catch (e: any) {
    if (String(e?.message || '') === 'session_revoked') throw e;
    console.warn('[auth] session revocation check failed open:', e?.message || e);
  }
  (data.user as any).aal = claims.aal || 'aal1';
  return data.user;
}

export async function requireAuth(req: Request) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('unauthorized');
  return verifySupabaseToken(token);
}

export async function getActiveProfile(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('store_profiles')
    .select(OWN_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'store_profiles_read_failed');
  if (!data) throw new Error('profile_missing');
  if ((data as any).account_status !== 'active') throw new Error('account_inactive');
  return data;
}

/** Ensure profile/wallet/security rows exist for Auth user. */
export async function ensureStoreProfile(user: { id: string; email?: string | null; user_metadata?: any }) {
  const db = getSupabaseAdmin();
  try {
    return await getActiveProfile(user.id);
  } catch (e: any) {
    if (String(e?.message) !== 'profile_missing') throw e;
  }

  const now = new Date().toISOString();
  const email = String(user.email || user.user_metadata?.email || '').toLowerCase() || null;
  const base =
    String(user.user_metadata?.username || email?.split('@')[0] || `user_${user.id.slice(0, 8)}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 24) || `user_${user.id.slice(0, 8)}`;
  const displayName = String(user.user_metadata?.display_name || base);

  const { data: created, error: createError } = await db
    .from('store_profiles')
    .insert({
      id: user.id,
      email,
      username: base,
      display_name: displayName,
      role: 'user',
      account_status: 'active',
      security_status: 'secure',
      created_at: now,
      updated_at: now,
    })
    .select(OWN_PROFILE_COLUMNS)
    .maybeSingle();

  if (createError) {
    const { data: again, error: againError } = await db
      .from('store_profiles')
      .select(OWN_PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();
    if (againError || !again) throw new Error(createError.message || 'store_profiles_insert_failed');
    if ((again as any).account_status !== 'active') throw new Error('account_inactive');
    return again;
  }

  await db.from('store_wallets').upsert({ user_id: user.id, balance: 0, frozen: false, updated_at: now }, { onConflict: 'user_id' });
  await db
    .from('store_security_profiles')
    .upsert({ user_id: user.id, pin_enabled: false, failed_attempts: 0, updated_at: now }, { onConflict: 'user_id' });
  return created!;
}

export async function requirePermission(userId: string, permission: string) {
  const profile = await getActiveProfile(userId);
  if ((profile as any).role === 'super_admin') return profile;
  const { data } = await getSupabaseAdmin()
    .from('store_admin_permissions')
    .select('permission')
    .eq('user_id', userId)
    .eq('permission', permission)
    .maybeSingle();
  if (!data) throw new Error('forbidden');
  return profile;
}
