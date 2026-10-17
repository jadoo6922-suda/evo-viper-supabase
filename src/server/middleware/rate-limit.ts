import { sha256 } from '../lib/crypto-util.js';

const localRateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const redisUrl = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
  const redisToken = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
  if (redisUrl && redisToken) {
    try {
      const seconds = Math.max(1, Math.ceil(windowMs / 1000));
      const script =
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; if n>tonumber(ARGV[2]) then return 0 else return 1 end";
      const response = await fetch(redisUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EVAL', script, '1', `evo-viper:rl:${sha256(key)}`, String(seconds), String(limit)]),
      });
      if (!response.ok) throw new Error(`Redis rate-limit request failed (${response.status})`);
      const payload: any = await response.json();
      if (payload?.error) throw new Error('Redis rate-limit command failed');
      return Number(payload?.result) !== 1;
    } catch (error) {
      console.error('[RateLimit] Shared limiter unavailable:', error);
      if (process.env.NODE_ENV === 'production') return true;
    }
  } else if (process.env.NODE_ENV === 'production' && process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT === 'true') {
    return true;
  }
  const now = Date.now();
  const previous = localRateLimitStore.get(key);
  if (previous && previous.resetAt > now && previous.count >= limit) return true;
  localRateLimitStore.set(
    key,
    previous && previous.resetAt > now
      ? { count: previous.count + 1, resetAt: previous.resetAt }
      : { count: 1, resetAt: now + windowMs },
  );
  if (localRateLimitStore.size > 10000) {
    for (const [k, value] of localRateLimitStore) {
      if (value.resetAt <= now) localRateLimitStore.delete(k);
    }
  }
  return false;
}
