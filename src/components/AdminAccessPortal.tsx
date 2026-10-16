import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchOwnProfile } from '../lib/serverApi';
import { useStore } from '../context/useStore';
import { AdminMfaScreen } from './AdminMfaScreen';
import { User } from '../types';
import { Mail, ShieldCheck, Loader2, AlertCircle, LockKeyhole, KeyRound } from 'lucide-react';

const ADMIN_ACCESS_EMAIL = 'jadoo.6922@gmail.com';

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

type ViewState = 'checking' | 'login' | 'mfa' | 'denied';

/**
 * صفحة دخول إدارة منفصلة بالكامل على /admin/<daily-token>
 * بدون توكن يومي صالح في الرابط لا تُعرض، ولا تظهر واجهة تسجيل دخول الزبائن.
 */
export function AdminAccessPortal() {
  const { setCurrentUserDirectly, refreshCurrentUser, setActiveTab } = useStore();
  const pathToken = useMemo(() => {
    try { sessionStorage.setItem('evo_pending_admin_path', window.location.pathname); } catch { /* ignore */ }
    const match = window.location.pathname.match(/^\/admin\/([A-Za-z0-9_-]{20,80})\/?$/);
    return match?.[1] || '';
  }, []);

  const [view, setView] = useState<ViewState>('checking');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<User | null>(null);
  const [gateMeta, setGateMeta] = useState<{ accessDate?: string; expiresAt?: string } | null>(null);

  const completeEntry = async (accessToken: string, adminProfile: User) => {
    const response = await fetch('/api/admin/access/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ pathToken }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'تعذر إكمال دخول الإدارة.');
    }
    if (result.requireMfa) {
      setProfile(adminProfile);
      setView('mfa');
      return;
    }
    await setCurrentUserDirectly({ ...adminProfile, mfaEnabled: Boolean(result.mfaEnabled ?? adminProfile.mfaEnabled) });
    await refreshCurrentUser();
    window.history.replaceState({}, '', '/');
    setActiveTab('admin');
  };

  useEffect(() => {
    let alive = true;
    const initialize = async () => {
      if (!pathToken) {
        if (alive) {
          setMessage('رابط الإدارة ناقص. يجب فتح الرابط اليومي الكامل المرسل إلى بريد الإدارة.');
          setView('denied');
        }
        return;
      }
      if (!supabase) {
        if (alive) {
          setMessage('إعدادات Supabase غير مكتملة على المتصفح.');
          setView('denied');
        }
        return;
      }
      try {
        const check = await fetch('/api/admin/access/validate-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pathToken }),
        });
        const checkBody = await check.json().catch(() => ({}));
        if (!check.ok || !checkBody.valid) {
          if (alive) {
            setMessage(checkBody.message || 'رابط الإدارة غير صالح أو انتهت صلاحيته لهذا اليوم.');
            setView('denied');
          }
          return;
        }
        if (alive) setGateMeta({ accessDate: checkBody.accessDate, expiresAt: checkBody.expiresAt });

        // إذا وُجدت جلسة من رابط البريد (magic link) نكمل مباشرة بعد التحقق من الدور.
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          const row = await fetchOwnProfile();
          if (row && ['admin', 'super_admin'].includes(row.role) && row.account_status === 'active') {
            const adminProfile = toAdminProfile(row, data.session.user.email || ADMIN_ACCESS_EMAIL);
            try {
              await completeEntry(data.session.access_token, adminProfile);
              return;
            } catch (err: any) {
              if (String(err?.message || '').toLowerCase().includes('mfa')) {
                if (alive) { setProfile(adminProfile); setView('mfa'); }
                return;
              }
              // خلاف ذلك اعرض نموذج كلمة المرور
            }
          }
        }
        if (alive) setView('login');
      } catch (error: any) {
        if (alive) {
          setMessage(error?.message || 'تعذر فتح بوابة الإدارة.');
          setView('denied');
        }
      }
    };
    void initialize();
    return () => { alive = false; };
  }, [pathToken]);

  const login = async () => {
    if (!supabase || !pathToken || !password) return;
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: ADMIN_ACCESS_EMAIL,
        password,
      });
      if (error || !data.session?.access_token) {
        throw new Error(error?.message || 'كلمة المرور غير صحيحة.');
      }
      const row = await fetchOwnProfile();
      if (!row || !['admin', 'super_admin'].includes(row.role) || row.account_status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('هذا الحساب ليس حساب إدارة نشطاً في المنصة.');
      }
      const adminProfile = toAdminProfile(row, data.user?.email || ADMIN_ACCESS_EMAIL);
      await completeEntry(data.session.access_token, adminProfile);
    } catch (error: any) {
      setMessage(error?.message || 'تعذر تسجيل الدخول الإداري.');
    } finally {
      setLoading(false);
    }
  };

  const finishMfa = async () => {
    if (!profile || !supabase) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('انتهت الجلسة. أعد تسجيل الدخول من رابط اليوم.');
      const response = await fetch('/api/admin/access/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pathToken, mfaConfirmed: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'تعذر تأكيد MFA.');
      await setCurrentUserDirectly({ ...profile, mfaEnabled: true });
      await refreshCurrentUser();
      window.history.replaceState({}, '', '/');
      setActiveTab('admin');
    } catch (error: any) {
      setMessage(error?.message || 'تعذر إكمال MFA.');
      setView('denied');
    }
  };

  if (view === 'mfa' && profile) {
    return <AdminMfaScreen email={profile.email} onVerified={() => { void finishMfa(); }} />;
  }

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-[#07090e] p-5 text-white">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#c5a059]/25 bg-[#10141d]/95 shadow-[0_24px_100px_rgba(0,0,0,.55)]">
        <header className="relative border-b border-white/10 bg-gradient-to-l from-[#3c0b18] via-[#17111b] to-[#10141d] px-7 py-8">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#c5a059] to-transparent" />
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c5a059]/40 bg-black/25 text-[#d9b76d]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.28em] text-[#d9b76d]">Private Admin Gateway</p>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">دخول الإدارة فقط</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            هذه صفحة منفصلة عن تسجيل دخول الزبائن. لا يمكن فتحها بدون الرابط اليومي السري.
          </p>
          {gateMeta?.accessDate && (
            <p className="mt-3 text-[11px] text-[#e7ce98]/80">صلاحية رابط اليوم: {gateMeta.accessDate} (UTC)</p>
          )}
        </header>

        <div className="space-y-5 px-7 py-7">
          {view === 'checking' && (
            <div className="flex items-center justify-center gap-3 py-8 text-sm text-white/65">
              <Loader2 className="h-5 w-5 animate-spin text-[#d9b76d]" /> جارٍ التحقق من رابط الإدارة...
            </div>
          )}

          {view === 'login' && (
            <>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-bold flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#d9b76d]" /> حساب الإدارة</p>
                <p className="mt-2 break-all font-mono text-sm text-[#e7ce98]">{ADMIN_ACCESS_EMAIL}</p>
                <p className="mt-2 text-xs leading-5 text-white/50">أدخل كلمة مرور حساب الإدارة. لن تُعرض هذه الصفحة للعامة بدون التوكن اليومي في الرابط.</p>
              </div>
              <label className="block text-xs text-white/65">
                كلمة المرور
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-white"
                  onKeyDown={(e) => { if (e.key === 'Enter') void login(); }}
                />
              </label>
              <button
                type="button"
                onClick={() => void login()}
                disabled={loading || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#8c172d] to-[#4b0d1b] px-4 py-4 text-sm font-bold disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LockKeyhole className="h-4 w-4" /> دخول لوحة الإدارة</>}
              </button>
            </>
          )}

          {view === 'denied' && (
            <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-950/20 p-5">
              <AlertCircle className="mb-3 h-7 w-7 text-red-300" />
              <h2 className="font-bold">تعذر فتح بوابة الإدارة</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">{message || 'الرابط غير صالح أو انتهت صلاحيته.'}</p>
            </div>
          )}

          {message && view !== 'denied' && (
            <p role="alert" className="rounded-xl border border-red-400/20 bg-red-950/20 p-3 text-xs leading-5 text-red-200">{message}</p>
          )}

          <div className="flex items-start gap-2 border-t border-white/10 pt-4 text-[10px] leading-5 text-white/35">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#c5a059]/70" />
            <p>هذه البوابة منفصلة عن متجر الزبائن. الرابط يتغير يومياً. لا تشارك الرابط مع أحد.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
