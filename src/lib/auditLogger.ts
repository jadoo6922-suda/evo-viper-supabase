import { supabase } from './supabase';
import { AuditLogItem } from '../types';

let cachedClientIp: string = 'Detecting...';

// Asynchronously resolve real client IP on first load so local states have it immediately
export async function getRealClientIp(): Promise<string> {
  if (cachedClientIp !== 'Detecting...' && cachedClientIp !== 'unknown') {
    return cachedClientIp;
  }
  try {
    const res = await fetch('/api/my-ip');
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedClientIp = data.ip;
        return cachedClientIp;
      }
    }
  } catch {
    // If backend is booting, try direct ip service fallback
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        cachedClientIp = ipData.ip || '127.0.0.1';
        return cachedClientIp;
      }
    } catch {}
  }
  cachedClientIp = '127.0.0.1';
  return cachedClientIp;
}

export async function logEvent(
  action: string,
  target: string = 'system',
  metadata?: any,
  actorEmail?: string,
  actorRole?: string
): Promise<AuditLogItem> {
  let token: string | undefined;
  try {
    const { data } = await supabase?.auth.getSession() || { data: { session: null } };
    token = data.session?.access_token;
  } catch {}

  const now = new Date().toISOString();
  const fallbackId = 'AUD-' + Math.floor(100000 + Math.random() * 900000);

  try {
    const res = await fetch('/api/log-secure-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        action,
        target,
        actorEmail: actorEmail || 'system',
        actorRole: actorRole || 'client',
        metadata,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.log) {
        cachedClientIp = data.log.ip;
        return {
          id: data.log.id || fallbackId,
          actorEmail: data.log.actorEmail || actorEmail || 'system',
          actorRole: (data.log.actorRole || actorRole || 'customer') as any,
          action: data.log.action || action,
          target: data.log.target || target,
          result: 'success',
          timestamp: data.log.timestamp || now,
          ip: data.log.ip || '127.0.0.1',
        };
      }
    }
  } catch (err) {
    console.warn('Backend logEvent call failed, using client fallback:', err);
  }

  // Fallback audit record with resolved IP
  const realIp = await getRealClientIp();
  return {
    id: fallbackId,
    actorEmail: actorEmail || 'system',
    actorRole: (actorRole || 'customer') as any,
    action,
    target,
    result: 'warning',
    timestamp: now,
    ip: realIp,
  };
}
