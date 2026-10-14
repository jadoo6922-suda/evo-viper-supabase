import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface BootstrapSuperAdminScreenProps { setupSecret: string; }
export const BootstrapSuperAdminScreen: React.FC<BootstrapSuperAdminScreenProps> = ({ setupSecret: _setupSecret }) => {
  const [secret, setSecret] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!secret || !email || !password || !confirmPassword) { setError('يرجى تعبئة جميع الحقول.'); return; }
    if (password !== confirmPassword) { setError('كلمات المرور غير متطابقة.'); return; }
    if (password.length < 12) { setError('كلمة المرور يجب أن تكون 12 حرفاً على الأقل.'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/admin/bootstrap-super-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, email: email.trim().toLowerCase(), password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'تعذر إنشاء المدير العام.');
      setSuccess(true); setSecret(''); setPassword(''); setConfirmPassword('');
    } catch (err: any) { setError(err?.message || 'تعذر إنشاء الحساب.'); }
    finally { setLoading(false); }
  };
  return <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4" dir="rtl"><div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-2xl"><div className="flex flex-col items-center text-center mb-6"><div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400"><ShieldCheck className="w-7 h-7" /></div><h1 className="text-xl font-bold mb-2">إعداد المدير العام الأول</h1><p className="text-xs text-slate-400">تعمل هذه البوابة فقط إذا لم يوجد مدير عام مسبقاً، وتستخدم سراً محفوظاً على الخادم.</p></div>{success ? <div className="text-center py-6"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" /><h2 className="font-bold text-emerald-300">تم إنشاء حساب المدير العام</h2><p className="text-xs text-slate-400 mt-2">أزل BOOTSTRAP_SECRET من بيئة الخادم بعد تسجيل الدخول والتأكد من صلاحية الحساب.</p></div> : <form onSubmit={handleSubmit} className="space-y-4">{error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-300 text-xs"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}<label className="block text-xs text-slate-300">سر الإعداد من بيئة الخادم<input type="password" autoComplete="off" value={secret} onChange={e => setSecret(e.target.value)} className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 p-3" /></label><label className="block text-xs text-slate-300"><Mail className="inline w-3 h-3 ml-1" />البريد الإلكتروني<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 p-3" /></label><label className="block text-xs text-slate-300"><Lock className="inline w-3 h-3 ml-1" />كلمة المرور<input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 p-3" /></label><label className="block text-xs text-slate-300">تأكيد كلمة المرور<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 p-3" /></label><button disabled={loading} className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold disabled:opacity-50 flex justify-center items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء المدير العام'}</button></form>}</div></div>;
};
