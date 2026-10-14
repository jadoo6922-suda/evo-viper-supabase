import { supabase } from './supabase';


export async function logAuditEvent(action: string, metadata?: Record<string, any>) {
  try {
    const { data } = await supabase?.auth.getSession() || { data: { session: null } };
    const token = data.session?.access_token;
    if (!token) return; // Non-authenticated, ignore

    await fetch('/api/log-secure-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action, metadata: metadata || {} }),
    });
  } catch (err) {
    console.warn('Audit log failed (non-critical):', err);
    // Non-blocking catch
  }
}
