/** Money with at most 2 decimal places (avoids float false rejects like 19.99). */
export function isValidMoneyAmount(value: unknown, min = 0.01, max = 50000): value is number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return false;
  return Math.round(n * 100) === Number((n * 100).toFixed(0));
}

export function clientIp(req: { headers: Record<string, unknown>; ip?: string; socket?: { remoteAddress?: string } }): string {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim()) return cf.trim();
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
}

export const SENSITIVE_PERMISSIONS = new Set([
  'wallet_adjust',
  'manage_escrow_settings',
  'manage_emergency',
  'manage_roles',
  'manage_users',
  'merchant_manager',
  'manage_products',
  'manage_disputes',
  'manage_reports',
]);

export const CLIENT_AUDIT_ALLOWLIST = new Set([
  'USER_LOGIN',
  'USER_LOGOUT',
  'PROFILE_VIEW',
  'CATALOG_VIEW',
  'SUPPORT_MESSAGE_SENT',
]);

export const OWN_PROFILE_COLUMNS =
  'id,email,username,display_name,role,account_status,created_at,security_status,has_pin_set,avatar_url,mfa_enabled,merchant_activated_at,merchant_license_id,merchant_license_revoked_at,merchant_license_revoke_reason,verified_seller,referral_code,referred_by,referral_pending,telegram_chat_id,telegram_username,telegram_linked_at';
