import crypto from 'crypto';
import { scryptAsync } from '../lib/crypto-util.js';
import { getSupabaseAdmin } from '../config/supabase.js';

export async function setTransferPin(userId: string, pin: string) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('invalid PIN');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scryptAsync(pin, salt, 64)).toString('hex');
  const db = getSupabaseAdmin();
  const { error } = await db.from('store_security_profiles').upsert({
    user_id: userId,
    transfer_pin_hash: hash,
    transfer_pin_salt: salt,
    pin_enabled: true,
    failed_attempts: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message || 'pin_set_failed');
  await db.from('store_profiles').update({ has_pin_set: true, updated_at: new Date().toISOString() }).eq('id', userId);
  return true;
}

export async function verifyTransferPin(userId: string, pin: string) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('invalid PIN');
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('store_security_profiles')
    .select('transfer_pin_hash,transfer_pin_salt,pin_enabled,failed_attempts,locked_until')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.pin_enabled || !data.transfer_pin_hash || !data.transfer_pin_salt) {
    throw new Error('PIN not configured');
  }
  if (data.locked_until && new Date(data.locked_until).getTime() > Date.now()) {
    throw new Error('temporarily locked');
  }
  const candidate = (await scryptAsync(pin, data.transfer_pin_salt, 64)).toString('hex');
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(data.transfer_pin_hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const attempts = Number(data.failed_attempts || 0) + 1;
    await db.from('store_security_profiles').update({
      failed_attempts: attempts,
      locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
    throw new Error('invalid PIN');
  }
  await db.from('store_security_profiles').update({
    failed_attempts: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
  return true;
}
