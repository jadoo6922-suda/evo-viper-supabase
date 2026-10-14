import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchOwnProfile } from '../lib/serverApi';
import { AdminMfaScreen } from './AdminMfaScreen';
import { useStore } from '../context/StoreContext';
import { User } from '../types';
import { ShieldCheck, Mail, Loader2 } from 'lucide-react';

export function AdminLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const { setCurrentUserDirectly, refreshCurrentUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [loading, setLoading] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<User | null>(null);

  const handleLogin = async () => {
    if (!supabase) { setError('إعدادات Supabase غير مكتملة على الموقع.'); return; }
    if (!email.trim() || !password) { setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError || !data.user) throw signInError || new Error('تعذر تسجيل الدخول');
      const row = await fetchOwnProfile();
      if (!row || row.id !== data.user.id) throw new Error('لم يتم العثور على ملف الحساب الإداري في الخادم.');
      if (!['admin', 'super_admin'].includes(row.role)) { await supabase.auth.signOut(); throw new Error('هذا الحساب لا يملك صلاحيات الإدارة.'); }
      if (row.account_status !== 'active') { await supabase.auth.signOut(); throw new Error('الحساب الإداري موقوف.'); }
      const profile: User = { id: row.id, email: row.email || data.user.email || email.trim(), displayName: row.display_name || 'Administrator', username: row.username || `admin_${row.id.slice(0, 5)}`, role: row.role, status: 'active', createdAt: row.created_at || new Date().toISOString(), securityStatus: row.security_status || 'secure', mfaEnabled: Boolean(row.mfa_enabled), hasPinSet: Boolean(row.has_pin_set) };
      // Never grant an admin session after password-only authentication. Every admin
      // must pass Supabase TOTP MFA; first-time admins are enrolled in the MFA screen.
      setPendingProfile(profile);
      setStep('mfa');
    } catch (err: any) { setError(err?.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'); }
    finally { setLoading(false); }
  };

  const handleMfaVerified = async () => { if (pendingProfile) setCurrentUserDirectly(pendingProfile); await refreshCurrentUser(); onSuccess(); };
  if (step === 'mfa') return <AdminMfaScreen email={pendingProfile?.email || email.trim()} onVerified={handleMfaVerified} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0d12] p-6 text-[#f7f7f9] selection:bg-[#801428] selection:text-white">
      <div className="w-full max-w-sm space-y-5 bg-[#12161f]/90 p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059] shadow-lg"><ShieldCheck className="w-7 h-7" /></div>
        <div className="text-center"><h1 className="text-xl font-bold text-white tracking-tight">دخول لوحة الإدارة</h1><p className="text-xs text-white/50 mt-1">المصادقة عبر Supabase والتحقق من دور الحساب من قاعدة البيانات</p></div>
        <div className="space-y-3 pt-2">
          <div className="relative"><div className="absolute inset-y-0 ltr:left-3.5 rtl:right-3.5 flex items-center pointer-events-none text-white/30"><Mail className="w-4 h-4" /></div><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد الإلكتروني للإدارة" className="w-full ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#c5a059]" /></div>
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && void handleLogin()} placeholder="كلمة المرور" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#c5a059]" />
          <button onClick={() => void handleLogin()} disabled={loading} className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#801428] via-[#991b32] to-[#6b0f20] text-white font-bold border border-[#c5a059]/40 flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /><span>تحقق ودخول</span></>}</button>
        </div>
        {error && <p role="alert" className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-xs text-red-200">{error}</p>}
      </div>
    </div>
  );
}
