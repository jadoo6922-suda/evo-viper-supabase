import React, { useEffect, useState } from 'react';
import { Transaction } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Hash,
  Database,
  Lock,
  Award,
  Store,
  UserCheck,
} from 'lucide-react';

interface PublicVerifyViewProps {
  txId?: string;
  merchantId?: string;
  onBackToApp?: () => void;
}

export const PublicVerifyView: React.FC<PublicVerifyViewProps> = ({
  txId,
  merchantId,
  onBackToApp,
}) => {
  // Transaction State
  const [tx, setTx] = useState<Transaction | null>(null);

  // Merchant License State
  const [merchant, setMerchant] = useState<{
    id: string;
    displayName: string;
    username?: string;
    licenseId: string;
    licenseStatus: 'active' | 'suspended' | 'revoked' | 'pending';
    status: string;
    role: string;
    createdAt?: string;
    merchantActivatedAt?: string;
    revokeReason?: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [verificationTime, setVerificationTime] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Transaction Verification Effect
  useEffect(() => {
    if (!txId) return;
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    const checkTransaction = async () => {
      try {
        const res = await fetch(`/api/public-verify/${encodeURIComponent(txId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.found && data.transaction && isMounted) {
            setTx(data.transaction as Transaction);
            setVerificationTime(new Date().toLocaleString('ar-SA'));
            setLoading(false);
            return;
          }
        }

        if (isMounted) {
          setTx(null);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('Public verification query error:', err);
        if (isMounted) {
          setErrorMsg('تعذر الاتصال بقاعدة البيانات للتحقق لحظياً.');
          setLoading(false);
        }
      }
    };

    checkTransaction();
    return () => {
      isMounted = false;
    };
  }, [txId]);

  // 2. Merchant License Verification Effect
  useEffect(() => {
    if (!merchantId) return;
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    const checkMerchant = async () => {
      try {
        const res = await fetch(`/api/public-verify-merchant/${encodeURIComponent(merchantId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.found && data.merchant && isMounted) {
            setMerchant(data.merchant);
            setVerificationTime(new Date().toLocaleString('ar-SA'));
            setLoading(false);
            return;
          }
        }

        if (isMounted) {
          setMerchant(null);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('Merchant verify error:', err);
        if (isMounted) {
          setErrorMsg('تعذر الاستعلام عن سجل التاجر.');
          setLoading(false);
        }
      }
    };

    checkMerchant();
    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  return (
    <div className="min-h-screen bg-[#07090d] text-[#f7f7f9] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#801428] selection:text-white">
      <div className="w-full max-w-lg bg-[#0e1218] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center font-serif text-[#c5a059] font-bold text-sm">
              D
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">DigitalStore Official Registry</h1>
              <p className="text-[11px] text-white/50">
                {merchantId ? 'نظام التحقق العلني من تراخيص التجار المعتمدين' : 'نظام التحقق العلني المباشر من القيود المالية'}
              </p>
            </div>
          </div>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="text-xs text-[#c5a059] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>دخول المتجر</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-white/60">
              {merchantId
                ? 'جاري فحص السجل التجاري والتحقق من سريان الرخصة والضمان المالي...'
                : 'جاري قراءة القيد المالي والتحقق من التوقيع في السجل السحابي...'}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MERCHANT LICENSE VERIFICATION RESULTS */}
        {/* ========================================================================= */}
        {!loading && merchantId && (
          <>
            {!merchant ? (
              <div className="py-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-rose-900/30 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/50">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-rose-300">تحذير: التاجر غير مسجل في السجل الرسمي</h2>
                  <p className="text-xs text-white/60 max-w-sm mx-auto leading-relaxed">
                    لم يتم العثور على رخصة تجارية صالحة للمعرف <code className="text-[#c5a059] font-mono">{merchantId}</code>.
                    احذر من التعامل المالي المباشر خارج المنصة.
                  </p>
                </div>
                {errorMsg && <p className="text-[11px] text-rose-400/80">{errorMsg}</p>}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Hero Banner */}
                {merchant.licenseStatus === 'active' ? (
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3.5 text-emerald-400">
                    <CheckCircle2 className="w-7 h-7 shrink-0 text-emerald-400" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                        AUTHENTIC VERIFIED MERCHANT
                      </span>
                      <p className="text-sm font-bold text-white">تاجر معتمد ومرخص رسمياً في المنصة</p>
                    </div>
                  </div>
                ) : merchant.licenseStatus === 'suspended' ? (
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-3.5 text-amber-300">
                    <ShieldAlert className="w-7 h-7 shrink-0 text-amber-400" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block">
                        UNDER ADMINISTRATIVE REVIEW
                      </span>
                      <p className="text-sm font-bold text-white">الترخيص معلق مؤقتاً لوجود بلاغ قيد المراجعة</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center gap-3.5 text-rose-400">
                    <XCircle className="w-7 h-7 shrink-0 text-rose-400" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 block">
                        LICENSE REVOKED / FORFEITED
                      </span>
                      <p className="text-sm font-bold text-white">الترخيص ملغى ومسحوب بقرار إداري</p>
                    </div>
                  </div>
                )}

                {/* Details Table */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">اسم التاجر / المتجر</span>
                    <span className="font-bold text-sm text-white">
                      {merchant.displayName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 font-mono">
                    <span className="text-white/50 font-sans">رقم وثيقة الترخيص (License ID)</span>
                    <span className="text-amber-300 font-bold select-all">{merchant.licenseId}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">حالة السريان الحالية</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        merchant.licenseStatus === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : merchant.licenseStatus === 'suspended'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {merchant.licenseStatus === 'active'
                        ? 'ساري ونشط ✅'
                        : merchant.licenseStatus === 'suspended'
                        ? 'معلق احترازياً ⚠️'
                        : 'ملغى ومحظور ❌'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">تاريخ إصدار الترخيص</span>
                    <span className="text-white/80">
                      {merchant.merchantActivatedAt
                        ? new Date(merchant.merchantActivatedAt).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'غير متوفر'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">الضمان المالي التأميني</span>
                    <span className="font-bold text-[#c5a059] font-mono">
                      25 Coins (محجوز بالدفتر الرسمي)
                    </span>
                  </div>

                  {merchant.revokeReason && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                      <span className="font-bold block mb-1">سبب إلغاء الترخيص الموثق:</span>
                      {merchant.revokeReason}
                    </div>
                  )}
                </div>

                {/* Verification Footer */}
                <div className="pt-2 text-center text-[11px] text-white/40 space-y-1">
                  <p>تم استرجاع سجل التاجر مباشرة من قاعدة البيانات الرسمية للمتجر (Supabase).</p>
                  <p className="text-[#c5a059]/80 font-mono">لحظة الفحص الحية: {verificationTime}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TRANSACTION VERIFICATION RESULTS */}
        {/* ========================================================================= */}
        {!loading && txId && (
          <>
            {!tx ? (
              <div className="py-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-rose-900/30 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/50">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-rose-300">تحذير: المعاملة غير مسجلة في النظام</h2>
                  <p className="text-xs text-white/60 max-w-sm mx-auto leading-relaxed">
                    لم يتم العثور على أي قيد مالي بالمعرف <code className="text-[#c5a059] font-mono">{txId}</code>.
                    قد يكون هذا الإيصال مزيفاً أو تم تعديله ببرامج خارجية.
                  </p>
                </div>
                {errorMsg && <p className="text-[11px] text-rose-400/80">{errorMsg}</p>}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3.5 text-emerald-400">
                  <CheckCircle2 className="w-7 h-7 shrink-0 text-emerald-400" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                      GENUINE VERIFIED TRANSACTION
                    </span>
                    <p className="text-sm font-bold text-white">معاملة حقيقية وموثقة في الدفتر المالي</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">المبلغ المالي المعتمد</span>
                    <span className="font-bold text-base text-[#c5a059]">
                      {tx.amount} {tx.currency || 'COIN'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 font-mono">
                    <span className="text-white/50 font-sans">رقم المعاملة (TX ID)</span>
                    <span className="text-white select-all">{tx.id}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 font-mono">
                    <span className="text-white/50 font-sans">رقم المرجع (Reference)</span>
                    <span className="text-white select-all">{tx.reference}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-white/50 block text-[11px]">الطرف المرسل</span>
                      <span className="text-white font-medium truncate block mt-0.5">{'مخفي في التحقق العام'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-white/50 block text-[11px]">الطرف المستلم</span>
                      <span className="text-white font-medium truncate block mt-0.5">{'مخفي في التحقق العام'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">حالة القيد في السجل</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {tx.status === 'completed' ? 'مكتمل ونهائي (Completed)' : tx.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-white/50">تاريخ المعاملة</span>
                    <span className="text-white/80">{new Date(tx.timestamp).toLocaleString('ar-SA')}</span>
                  </div>

                </div>

                <div className="pt-2 text-center text-[11px] text-white/40 space-y-1">
                  <p>تم استرجاع هذه البيانات مباشرة من قاعدة البيانات الرسمية للمتجر (Supabase).</p>
                  <p className="text-[#c5a059]/80 font-mono">لحظة التحقق الحية: {verificationTime}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
