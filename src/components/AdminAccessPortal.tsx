import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchOwnProfile } from '../lib/serverApi';
import { useStore } from '../context/useStore';
import { AdminMfaScreen } from './AdminMfaScreen';
import { User } from '../types';
import { Mail, ShieldCheck, Loader2, AlertCircle, CheckCircle2, KeyRound, LockKeyhole, QrCode } from 'lucide-react';

const ADMIN_ACCESS_EMAIL = 'jadoo6922@gmail.com';
type ViewState = 'checking' | 'key' | 'login' | 'waiting-qr' | 'mfa' | 'denied';

function toAdminProfile(row: any, fallbackEmail: string): User {
  return {
    id: row.id,
    email: row.email || fallbackEmail,
    displayName: row.display_name || 'Administrator',
    username: row.username || `admin_${String(row.id).slice(0, 5)}`,
    role: row.role,
    status: row.account_status === 'suspended' || row.account_status === 'closed' ? 'suspended' : 'active',
    createdAt: row.created_at || new Date().toISOString(),
    securityStatus: row.security_status || 'secure',
    mfaEnabled: Boolean(row.mfa_enabled),
    hasPinSet: Boolean(row.has_pin_set),
  };
}

export function AdminAccessPortal() {
  const { setCurrentUserDirectly, refreshCurrentUser, setActiveTab } = useStore();
  const pathToken = useMemo(() => {
    const match = window.location.pathname.match(/^\/admin\/([A-Za-z0-9_-]{40,60})\/?$/);
    return match?.[1] || '';
  }, []);
  const qrToken = useMemo(() => new URLSearchParams(window.location.search).get('qr') || '', []);
  const [view, setView] = useState<ViewState>('checking');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dailyKey, setDailyKey] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<User | null>(null);

  const apiPost = async (endpoint: string, body: Record<string, unknown>, accessToken?: string) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || 'تعذر إكمال التحقق.');
    return result;
  };

  const completeQrIfPresent = async () => {
    if (!supabase || !pathToken || !qrToken) return false;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return false;
    await apiPost('/api/admin/access/complete-qr', { pathToken, qrToken }, accessToken);
    const authUser = sessionData.session?.user;
    if (!authUser) throw new Error('تعذر تحديد حساب الإدارة.');
    const row = await fetchOwnProfile();
    if (!row || row.id !== authUser.id || !['admin', 'super_admin'].includes(row.role) || row.account_status !== 'active') throw new Error('الحساب غير مخوّل للدخول إلى الإدارة.');
    setProfile(toAdminProfile(row, authUser.email || ADMIN_ACCESS_EMAIL));
    // Remove the consumed QR bearer token from the address bar immediately.
    window.history.replaceState({}, '', '/admin');
    setView('mfa');
    return true;
  };

  useEffect(() => {
    let alive = true;
    const initialize = async () => {
      if (!supabase) { setMessage('إعدادات Supabase غير مكتملة.'); setView('denied'); return; }
      if (!pathToken) { setMessage('رابط الإدارة ناقص أو غير صالح. افتح الرابط اليومي الذي وصلك بالبريد.'); setView('denied'); return; }
      try {
        if (qrToken) {
          const completed = await completeQrIfPresent();
          if (completed) return;
          if (alive) { setMessage('افتح رابط تسجيل الدخول المرسل إلى بريد الإدارة أولاً؛ سيعود بك إلى هذه البوابة بعد التحقق من البريد.'); setView('denied'); }
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const row = await fetchOwnProfile();
          if (row && row.id === data.session.user.id && ['admin', 'super_admin'].includes(row.role) && row.account_status === 'active') {
            const response = await fetch('/api/admin/access/verify-login', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ pathToken }) });
            if (response.ok) { setProfile(toAdminProfile(row, data.session.user.email || ADMIN_ACCESS_EMAIL)); setView('mfa'); return; }
          }
        }
        if (alive) { setMessage('يجب فتح رابط تسجيل الدخول المرسل من Supabase إلى بريد الإدارة (jadoo6922@gmail.com). بعد فتح رسالة البريد ستُعاد إلى هذه البوابة ثم يُطلب MFA. الرابط اليومي وحده لا يكفي.'); setView('denied'); }
      } catch (error: any) {
        if (alive) { setMessage(error?.message || 'تعذر التحقق من رابط الإدارة.'); setView('denied'); }
      }
    };
    void initialize();
    return () => { alive = false; };
  }, []);

  const verifyKey = async () => {
    if (!pathToken || !dailyKey.trim()) return;
    setLoading(true); setMessage('');
    try {
      await apiPost('/api/admin/access/verify-key', { pathToken, dailyKey });
      if (!qrToken) window.history.replaceState({}, '', '/admin');
      setView('login');
    } catch (error: any) { setMessage(error?.message || 'المفتاح غير صحيح أو منتهي الصلاحية.'); }
    finally { setLoading(false); }
  };

  const login = async () => {
    if (!supabase || !password) return;
    setLoading(true); setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: ADMIN_ACCESS_EMAIL, password });
      if (error || !data.user || !data.session) throw new Error('بيانات الحساب غير صحيحة أو تعذر تسجيل الدخول.');
      const row = await fetchOwnProfile();
      if (!row || row.id !== data.user.id || !['admin', 'super_admin'].includes(row.role) || row.account_status !== 'active' || String(row.email || '').toLowerCase() !== ADMIN_ACCESS_EMAIL) {
        await supabase.auth.signOut();
        throw new Error('هذا الحساب ليس حساب الإدارة المعتمد أو أنه غير نشط.');
      }
      await apiPost('/api/admin/access/verify-login', { pathToken }, data.session.access_token);
      setProfile(toAdminProfile(row, data.user.email || ADMIN_ACCESS_EMAIL));
      setPassword('');
      // If the QR was scanned first in this same browser, finish the QR step now.
      if (qrToken) {
        await completeQrIfPresent();
      } else {
        setView('waiting-qr');
      }
    } catch (error: any) { setMessage(error?.message || 'تعذر تسجيل الدخول الإداري.'); }
    finally { setLoading(false); }
  };

  const finishAdminLogin = async () => {
    if (!profile || !supabase) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('انتهت جلسة الدخول. أعد العملية من الرابط اليومي.');
      await apiPost('/api/admin/confirm-mfa', { pathToken }, token);
      await setCurrentUserDirectly({ ...profile, mfaEnabled: true });
      await refreshCurrentUser();
      window.history.replaceState({}, '', '/');
      setActiveTab('admin');
    } catch (error: any) { setMessage(error?.message || 'تعذر إكمال تسجيل الدخول الإداري.'); setView('denied'); }
  };

  if (view === 'mfa' && profile) return <AdminMfaScreen email={profile.email} onVerified={() => { void finishAdminLogin(); }} />;

  return <main dir="rtl" className="min-h-screen flex items-center justify-center bg-[#07090e] p-5 text-white selection:bg-[#801428] selection:text-white">
    <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#c5a059]/25 bg-[#10141d]/95 shadow-[0_24px_100px_rgba(0,0,0,.55)]">
      <header className="relative border-b border-white/10 bg-gradient-to-l from-[#3c0b18] via-[#17111b] to-[#10141d] px-7 py-8 sm:px-9">
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#c5a059] to-transparent" />
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c5a059]/40 bg-black/25 text-[#d9b76d]"><ShieldCheck className="h-7 w-7" /></div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.28em] text-[#d9b76d]">Private Control Gateway</p>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">بوابة الإدارة الخاصة</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">بوابة داخل الموقع نفسه برابط يومي عبر Supabase Auth، مع التحقق من صلاحية الحساب والتحقق متعدد العوامل.</p>
      </header>
      <div className="space-y-5 px-7 py-7 sm:px-9 sm:py-8">
        {view === 'checking' && <div className="flex items-center justify-center gap-3 py-8 text-sm text-white/65"><Loader2 className="h-5 w-5 animate-spin text-[#d9b76d]" /> جارٍ التحقق من رابط الدخول...</div>}
        {view === 'login' && <>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-sm font-bold">الخطوة الثانية: بيانات الحساب</p><p className="mt-1 text-xs leading-5 text-white/50">أدخل كلمة المرور التي أنشأتها للحساب. لن يتم إرسال كلمة المرور عبر البريد.</p><p className="mt-2 break-all font-mono text-sm text-[#e7ce98]">{ADMIN_ACCESS_EMAIL}</p></div>
          <label className="block text-xs text-white/65">كلمة المرور<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-white" /></label>
          <button onClick={() => void login()} disabled={loading || !password} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#8c172d] to-[#4b0d1b] px-4 py-4 text-sm font-bold disabled:opacity-50">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LockKeyhole className="h-4 w-4" /> التحقق من الحساب</>}</button>
        </>}
        {view === 'waiting-qr' && <div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/20 p-5"><CheckCircle2 className="mb-3 h-7 w-7 text-emerald-300" /><h2 className="font-bold">تم التحقق من الحساب</h2><p className="mt-2 text-sm leading-6 text-white/65">تم التحقق من رابط البريد والحساب. أكمل الآن التحقق متعدد العوامل.</p><div className="mt-4 flex items-center gap-2 text-xs text-[#e7ce98]"><ShieldCheck className="h-4 w-4" /> تم التحقق من رابط البريد</div></div>}
        {view === 'denied' && <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-950/20 p-5"><AlertCircle className="mb-3 h-7 w-7 text-red-300" /><h2 className="font-bold">تعذر فتح بوابة الإدارة</h2><p className="mt-2 text-sm leading-6 text-white/70">{message || 'الرابط غير صالح أو انتهت صلاحيته.'}</p></div>}
        {message && view !== 'denied' && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-950/20 p-3 text-xs leading-5 text-red-200">{message}</p>}
        <div className="flex items-start gap-2 border-t border-white/10 pt-4 text-[10px] leading-5 text-white/35"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#c5a059]/70" /><p>لا تشارك الرابط أو المفتاح أو رمز QR. كلمة المرور لا تُرسل بالبريد. يتطلب الدخول النهائي أيضاً اجتياز التحقق متعدد العوامل.</p></div>
      </div>
    </div>
  </main>;
}
