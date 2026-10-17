import crypto from 'crypto';

/** Lazy HMAC secret — missing value fails only receipt/signing routes, not process boot /health. */
export function getHmacSecret(): string {
  const secret = process.env.RECEIPT_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('RECEIPT_HMAC_SECRET must be a strong random secret of at least 32 characters.');
  }
  return secret;
}

export function computeRealHmac(txId: string, amount: number | string): string {
  const numericAmount = Number(amount);
  const normalizedAmount = Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : String(amount);
  return crypto.createHmac('sha256', getHmacSecret()).update(`${txId}:${normalizedAmount}`).digest('hex');
}
