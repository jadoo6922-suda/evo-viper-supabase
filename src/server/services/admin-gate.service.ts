import { getSupabaseAdmin } from '../config/supabase.js';
import { sha256, utcDateKey, randomToken, sleep } from '../lib/crypto-util.js';

const ADMIN_GATE_EMAIL = String(process.env.ADMIN_GATE_EMAIL || 'jadoo.6922@gmail.com').trim().toLowerCase();

export function getAdminGateEmail() {
  return ADMIN_GATE_EMAIL;
}

async function sendSupabaseAuthLink(to: string, redirectTo: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.auth.signInWithOtp({
    email: to,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  });
  if (error) {
    const status = (error as any).status || (error as any).code || 'unknown';
    const msg = String(error.message || 'auth_email_failed').slice(0, 200);
    throw new Error(`Supabase Auth email queue failed (${status}): ${msg}`);
  }
}

export async export function sendSupabaseAuthLinkWithRetry(to: string, redirectTo: string, attempts = 3) {
  let lastError: Error | null = null;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await sendSupabaseAuthLink(to, redirectTo);
      return { attempts: i };
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Admin Gate] Auth email attempt ${i}/${attempts} failed:`, lastError.message);
      if (i < attempts) await sleep(1000 * (2 ** (i - 1)));
    }
  }
  throw lastError || new Error('Supabase Auth email failed');
}

export async export function issueMerchantActivationToken(userId: string) {
  const db = getSupabaseAdmin();
  const [{ data: profile }, { data: application }, { data: deposit }] = await Promise.all([
    db.from('store_profiles').select('id,email,display_name,account_status,role').eq('id', userId).maybeSingle(),
    db.from('store_merchant_applications').select('id,status,license_paid').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('store_merchant_deposits').select('id,status,amount').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!profile || profile.account_status !== 'active' || !profile.email) throw new Error('حساب التاجر غير نشط أو لا يملك بريداً صالحاً.');
  if (!application || application.status !== 'approved' || application.license_paid !== true || !deposit || deposit.status !== 'held') throw new Error('التفعيل متوقف حتى اعتماد الطلب وتأكيد رسوم الترخيص والضمان في الدفتر المالي.');
  const rawToken = randomToken(32);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await db.from('store_merchant_activation_tokens').update({ used_at: new Date().toISOString() }).eq('user_id', userId).is('used_at', null);
  const { error } = await db.from('store_merchant_activation_tokens').insert({ user_id: userId, token_hash: sha256(rawToken), expires_at: expiresAt });
  if (error) throw error;
  const appUrl = String(process.env.PUBLIC_APP_URL || '').replace(/\/+$/, '');
  if (!appUrl) throw new Error('PUBLIC_APP_URL is required for merchant activation email.');
  const activationUrl = `${appUrl}/?merchant_activation=1&activation_token=${encodeURIComponent(rawToken)}`;
  await sendSupabaseAuthLink(profile.email, activationUrl);
  return { expiresAt };
}

export async export function deliverDailyAdminGate(options: { forceResend?: boolean } = {}) {
  const publicUrl = String(process.env.PUBLIC_APP_URL || process.env.APP_URL || 'https://evoweb.onrender.com').replace(/\/+$/, '');
  if (!publicUrl.startsWith('https://')) throw new Error('PUBLIC_APP_URL must be an https URL for the admin gate.');
  if (!ADMIN_GATE_EMAIL || !ADMIN_GATE_EMAIL.includes('@')) throw new Error('ADMIN_GATE_EMAIL is not configured.');

  const db = getSupabaseAdmin();
  const today = utcDateKey();
  // Drop previous days only (hashes of expired tokens).
  await db.from('store_admin_daily_access').delete().lt('access_date', today);

  const { data: existing, error: existingError } = await db.from('store_admin_daily_access')
    .select('id,sent_at,used_at').eq('access_date', today).maybeSingle();
  if (existingError) throw new Error(existingError.message || 'daily_admin_access_read_failed');

  // One active gate per UTC day. Do not mint duplicates on restart/cron overlap.
  if (existing?.sent_at && !options.forceResend) {
    console.info(`[Admin Gate] Already delivered for ${today}; skip.`);
    return { status: 'already_sent' as const, accessDate: today };
  }
  if (existing?.used_at) {
    console.info(`[Admin Gate] Gate for ${today} already consumed; skip.`);
    return { status: 'already_used' as const, accessDate: today };
  }

  let pathToken = randomToken(32);
  let rowId: string | null = existing?.id || null;

  if (!existing) {
    const expiresAt = new Date(`${today}T23:59:59.999Z`).toISOString();
    const { data: inserted, error: insertError } = await db.from('store_admin_daily_access').insert({
      access_date: today,
      path_token_hash: sha256(pathToken),
      key_hash: sha256(randomToken(32)),
      qr_token_hash: sha256(randomToken(32)),
      expires_at: expiresAt,
      send_attempts: 0,
    }).select('id').maybeSingle();
    if (insertError) {
      // Concurrent cron/instance won the insert — do not create a second active token.
      if (String((insertError as any).code) === '23505') {
        console.info(`[Admin Gate] Concurrent insert for ${today}; skip.`);
        return { status: 'race_skip' as const, accessDate: today };
      }
      throw insertError;
    }
    if (!inserted) return { status: 'insert_empty' as const, accessDate: today };
    rowId = inserted.id;
  } else if (options.forceResend) {
    // Rotate path token hash on forced resend so old links die; still one row per day.
    pathToken = randomToken(32);
    const { error: rotError } = await db.from('store_admin_daily_access').update({
      path_token_hash: sha256(pathToken),
      key_hash: sha256(randomToken(32)),
      qr_token_hash: sha256(randomToken(32)),
      sent_at: null,
      key_verified_at: null,
      qr_verified_at: null,
      used_at: null,
      attempts: 0,
      last_error: null,
    }).eq('id', existing.id).is('used_at', null);
    if (rotError) throw rotError;
    rowId = existing.id;
  } else {
    // Row exists but email never marked sent — rotate token and retry send once.
    pathToken = randomToken(32);
    const { error: rotError } = await db.from('store_admin_daily_access').update({
      path_token_hash: sha256(pathToken),
      key_hash: sha256(randomToken(32)),
      qr_token_hash: sha256(randomToken(32)),
    }).eq('id', existing.id);
    if (rotError) throw rotError;
    rowId = existing.id;
  }

  // Query form survives Supabase email redirects more reliably than /admin/<token> alone.
  const loginUrl = `${publicUrl}/?admin_gate=${encodeURIComponent(pathToken)}`;
  try {
    const sendResult = await sendSupabaseAuthLinkWithRetry(ADMIN_GATE_EMAIL, loginUrl, 3);
    const now = new Date().toISOString();
    const { error: sentError } = await db.from('store_admin_daily_access').update({
      sent_at: now,
      key_verified_at: now,
      send_attempts: sendResult.attempts,
      last_error: null,
    }).eq('id', rowId);
    if (sentError) throw sentError;
    // Never log pathToken or full login URL.
    console.info(`[Admin Gate] Auth email queued for access_date=${today} attempts=${sendResult.attempts} to_domain=${ADMIN_GATE_EMAIL.split('@')[1] || 'unknown'}`);
    return { status: 'sent' as const, accessDate: today, attempts: sendResult.attempts };
  } catch (error: any) {
    const errMsg = String(error?.message || 'send_failed').slice(0, 240);
    await db.from('store_admin_daily_access').update({
      last_error: errMsg,
      send_attempts: 3,
    }).eq('id', rowId);
    // Keep the row so cron can force-resend without flooding new rows; do not leave a usable silent token without sent_at.
    console.error(`[Admin Gate] Delivery failed for ${today}:`, errMsg);
    throw error;
  }
}

export function scheduleDailyAdminGate() {
  const run = async () => {
    let failed = false;
    try { await deliverDailyAdminGate(); }
    catch (error) { failed = true; console.error('[Admin Gate] Daily delivery failed:', error); }
    const now = new Date();
    const next = failed ? new Date(Date.now() + 15 * 60 * 1000) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 5, 0));
    setTimeout(run, Math.max(1000, next.getTime() - Date.now()));
  };
  // Retry startup failures periodically; the DB uniqueness constraint prevents duplicate daily records.
  void run();
}
