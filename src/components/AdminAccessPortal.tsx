import React, { useEffect, useMemo, useState } from 'react';
import { supabase, initSupabase } from '../lib/supabase';
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

type ViewState = 'checking' | 'login' | 'link_sent' | 'mfa' | 'denied';

/** صفحة إدارة منفصلة: الرابط اليومي + دخول بدون كلمة مرور عبر رابط البريد */
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
  const [showPassword, setShowPassword] = useState(false);
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

  const trySessionEntry = async () => {
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) return false;
    const row = await fetchOwnProfile();
    if (!row || !['admin', 'super_admin'].includes(row.role) || row.account_status !== 'active') return false;
    const adminProfile = toAdminProfile(row, data.session.user.email || ADMIN_ACCESS_EMAIL);
    try {
      await completeEntry(data.session.access_token, adminProfile);
      return true;
    } catch (err: any) {
      if (String(err?.message || '').toLowerCase().includes('mfa')) {
        setProfile(adminProfile);
        setView('mfa');
        return true;
      }
      setMessage(err?.message || 'تعذر إكمال الدخول.');
      return false;
    }
  };

  useEffect(() => {
    let alive = true;
    let unsub: { unsubscribe: () => void } | null = null;

    const initialize = async () => {
      await initSupabase();
      if (!pathToken) {
        if (alive) {
          setMessage('رابط الإدارة ناقص. افتح الرابط اليومي الكامل من بريد الإدارة.');
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

        // استمع لجلسة رابط البريد (magic link) وأكمل الدخول تلقائياً — بدون كلمة مرور
        const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!alive) return;
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.access_token) {
            await trySessionEntry();
          }
        });
        unsub = sub.subscription;

        // انتظر لحظة لمعالجة هاش الرابط من الإيميل
        await new Promise((r) => setTimeout(r, 400));
        const entered = await trySessionEntry();
        if (!entered && alive) setView('login');
      } catch (error: any) {
        if (alive) {
          setMessage(error?.message || 'تعذر فتح بوابة الإدارة.');
          setView('denied');
        }
      }
    };
    void initialize();
    return () => {
      alive = false;
      unsub?.unsubscribe();
    };
  }, [pathToken]);

  /** إرسال رابط دخول لبريد الإدارة من المتصفح (بدون كلمة مرور) */
  const sendEmailLink = async () => {
    await initSupabase();
    if (!supabase || !pathToken) return;
    setLoading(true);
    setMessage('');
    try {
      const redirectTo = `${window.location.origin}/admin/${pathToken}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: ADMIN_ACCESS_EMAIL,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      setView('link_sent');
    } catch (error: any) {
      setMessage(error?.message || 'تعذر إرسال رابط الدخول. تحقق من إعداد بريد Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithPassword = async () => {
    await initSupabase();
    if (!supabase || !pathToken || !password) return;
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: ADMIN_ACCESS_EMAIL,
        password,
      });
      if (error || !data.session?.access_token) {
        throw new Error(error?.message || 'كلمة المرور غير صحيحة أو غير مُعيَّنة لهذا الحساب.');
      }
      const row = await fetchOwnProfile();
      if (!row || !['admin', 'super_admin'].includes(row.role) || row.account_status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('هذا الحساب ليس حساب إدارة نشطاً. نفّذ SQL لرفع الدور إلى super_admin.');
      }
      const adminProfile = toAdminProfile(row, data.user?.email || ADMIN_ACCESS_EMAIL);
      await completeEntry(data.session.access_token, adminProfile);
    } catch (error: any) {
      setMessage(error?.message || 'تعذر تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  };

  const finishMfa = async () => {
    if (!profile || !supabase) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('انتهت الجلسة.');
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
          <h1 className="text-2xl font-black tracking-tight">دخول الإدارة</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            صفحة منفصلة عن الزبائن. الدخول الأساسي عبر رابط يُرسل لبريدك — بدون الحاجة لكلمة مرور.
          </p>
          {gateMeta?.accessDate && (
            <p className="mt-3 text-[11px] text-[#e7ce98]/80">رابط اليوم: {gateMeta.accessDate} (UTC)</p>
          )}
        </header>

        <div className="space-y-5 px-7 py-7">
          {view === 'checking' && (
            <div className="flex items-center justify-center gap-3 py-8 text-sm text-white/65">
              <Loader2 className="h-5 w-5 animate-spin text-[#d9b76d]" /> جارٍ التحقق...
            </div>
          )}

          {view === 'login' && (
            <>
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-950/20 p-4">
                <p className="text-sm font-bold text-emerald-100">الطريقة الموصى بها (بدون كلمة مرور)</p>
                <p className="mt-2 text-xs leading-6 text-white/55">
                  اضغط الزر ليُرسل Supabase رابط دخول لمرة واحدة إلى:
                </p>
                <p className="mt-2 break-all font-mono text-sm text-[#e7ce98]">{ADMIN_ACCESS_EMAIL}</p>
              </div>
              <button
                type="button"
                onClick={() => void sendEmailLink()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#8c172d] to-[#4b0d1b] px-4 py-4 text-sm font-bold disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Mail className="h-4 w-4" /> أرسل رابط الدخول لبريدي</>}
              </button>

              <button
                type="button"
                className="w-full text-center text-xs text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'إخفاء الدخول بكلمة المرور' : 'لدي كلمة مرور وأريد استخدامها (اختياري)'}
              </button>

              {showPassword && (
                <>
                  <label className="block text-xs text-white/65">
                    كلمة مرور حساب الإدارة (إن كانت مُعيَّنة)
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-white"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void loginWithPassword()}
                    disabled={loading || !password}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold disabled:opacity-50"
                  >
                    <LockKeyhole className="h-4 w-4" /> دخول بكلمة المرور
                  </button>
                </>
              )}
            </>
          )}

          {view === 'link_sent' && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/20 p-5">
              <Mail className="mb-3 h-7 w-7 text-emerald-300" />
              <h2 className="font-bold">تم إرسال رابط الدخول</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">
                افتح بريد <span className="text-[#e7ce98]">{ADMIN_ACCESS_EMAIL}</span> واضغط رابط الدخول.
                سيعيدك لنفس هذه الصفحة ثم تدخل لوحة الإدارة تلقائياً.
              </p>
              <p className="mt-3 text-xs text-white/45">تحقق أيضاً من البريد المهمل (Spam).</p>
              <button
                type="button"
                className="mt-4 text-xs text-[#e7ce98] underline"
                onClick={() => setView('login')}
              >
                إعادة الإرسال
              </button>
            </div>
          )}

          {view === 'denied' && (
            <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-950/20 p-5">
              <AlertCircle className="mb-3 h-7 w-7 text-red-300" />
              <h2 className="font-bold">تعذر فتح بوابة الإدارة</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">{message || 'الرابط غير صالح.'}</p>
            </div>
          )}

          {message && view !== 'denied' && (
            <p role="alert" className="rounded-xl border border-red-400/20 bg-red-950/20 p-3 text-xs leading-5 text-red-200">{message}</p>
          )}

          <div className="flex items-start gap-2 border-t border-white/10 pt-4 text-[10px] leading-5 text-white/35">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#c5a059]/70" />
            <p>
              لا نرسل كلمة مرور في الإيميل لأسباب أمنية. الرابط اليومي + رابط الدخول لمرة واحدة كافيان.
              كلمة المرور اختيارية فقط إذا كنت عيّنتها مسبقاً على الحساب.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
