import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

type TotpFactor = { id: string; status: string; friendly_name?: string };

/**
 * Admin MFA gate. Existing verified TOTP factors are challenged; accounts without
 * a verified factor must enroll by scanning a QR locally, then prove possession.
 * The QR is shown only during enrollment and is never emailed or stored in the DB.
 */
export function AdminMfaScreen({ email, onVerified }: { email: string; onVerified: () => void }) {
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isEnrollment, setIsEnrollment] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const prepare = async () => {
      if (!supabase) { setError('إعدادات Supabase غير مكتملة.'); setLoading(false); return; }
      try {
        const { data, error: factorError } = await supabase.auth.mfa.listFactors();
        if (factorError) throw factorError;
        const factor = data?.totp?.find((item: TotpFactor) => item.status === 'verified');
        if (factor) {
          const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
          if (challengeError || !challenge?.id) throw challengeError || new Error('تعذر إنشاء تحدي MFA.');
          if (!alive) return;
          setFactorId(factor.id); setChallengeId(challenge.id); setIsEnrollment(false);
        } else {
          // Remove abandoned, unverified enrollments before creating a fresh setup.
          for (const pending of (data?.totp || []).filter((item: TotpFactor) => item.status !== 'verified')) {
            await supabase.auth.mfa.unenroll({ factorId: pending.id });
          }
          const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Admin ${email}` });
          if (enrollError || !enrollment?.id || !enrollment?.totp?.uri) throw enrollError || new Error('تعذر بدء إعداد المصادقة.');
          const qr = await QRCode.toDataURL(enrollment.totp.uri, { errorCorrectionLevel: 'H', margin: 2, width: 240 });
          if (!alive) return;
          setFactorId(enrollment.id); setQrDataUrl(qr); setIsEnrollment(true);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'تعذر إعداد التحقق متعدد العوامل.');
      } finally { if (alive) setLoading(false); }
    };
    void prepare();
    return () => { alive = false; };
  }, [email]);

  const handleVerify = async () => {
    if (!supabase || !factorId || !/^\d{6}$/.test(code)) return;
    setLoading(true); setError('');
    try {
      let challenge = challengeId;
      if (!isEnrollment && !challenge) throw new Error('انتهت جلسة التحقق. أعد تسجيل الدخول.');
      if (isEnrollment) {
        const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError || !data?.id) throw challengeError || new Error('تعذر إنشاء تحدي التفعيل.');
        challenge = data.id;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge, code });
      if (verifyError) throw verifyError;
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || aal?.currentLevel !== 'aal2') throw new Error('لم يتم إثبات مستوى المصادقة الثاني.');
      onVerified();
    } catch (e: any) {
      setError(e?.message || 'الرمز غير صحيح أو انتهت صلاحيته.');
      setCode('');
    } finally { setLoading(false); }
  };

  return <div className="min-h-screen flex items-center justify-center bg-[#0a0d12] p-6 text-[#f7f7f9]"><div className="w-full max-w-sm text-center space-y-5 bg-[#12161f]/90 p-8 rounded-2xl border border-white/10 shadow-2xl"><div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059]"><ShieldCheck className="w-7 h-7" /></div><div><h2 className="text-xl font-bold text-white">{isEnrollment ? 'تفعيل حماية الإدارة' : 'التحقق الإداري متعدد العوامل'}</h2><p className="text-xs text-white/50 mt-1">{email}</p><p className="text-xs text-white/60 mt-2 leading-5">{isEnrollment ? 'امسح رمز QR بتطبيق مصادقة موثوق، ثم أدخل الرمز المكوّن من 6 أرقام لإثبات ملكيتك للجهاز.' : 'أدخل الرمز الحالي من تطبيق المصادقة المرتبط بحسابك.'}</p></div>{loading && !qrDataUrl ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : null}{isEnrollment && qrDataUrl && <div className="mx-auto w-fit rounded-xl bg-white p-3"><img src={qrDataUrl} alt="رمز إعداد المصادقة الثنائية" className="w-60 h-60" /><p className="text-[10px] text-gray-600 mt-2">لا تشارك رمز الإعداد مع أي شخص</p></div>}<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" placeholder="رمز من 6 أرقام" className="w-full px-4 py-3.5 rounded-xl bg-black/50 border border-white/10 text-white text-center text-lg tracking-[0.3em] font-mono" /><button onClick={() => void handleVerify()} disabled={loading || code.length !== 6 || !factorId} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#801428] to-[#6b0f20] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isEnrollment ? 'تأكيد التفعيل والدخول' : 'تحقق ودخول'} <ArrowRight className="w-4 h-4" /></>}</button>{error && <div role="alert" className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2 text-right"><AlertCircle className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" /><p className="text-xs text-white/80 leading-relaxed">{error}</p></div>}<p className="text-[10px] text-white/40">رموز تطبيق المصادقة تتجدد تلقائياً كل فترة قصيرة؛ لا ترسل كلمة المرور أو رمز QR بالبريد.</p></div></div>;
}
