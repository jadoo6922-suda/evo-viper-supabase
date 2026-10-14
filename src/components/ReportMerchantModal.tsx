import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../context/StoreContext';
import { ShieldAlert, AlertTriangle, X, CheckCircle2, Loader2, Send } from 'lucide-react';

interface ReportMerchantModalProps {
  merchantId: string;
  merchantName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReportMerchantModal: React.FC<ReportMerchantModalProps> = ({
  merchantId,
  merchantName,
  onClose,
  onSuccess,
}) => {
  const { language, currentUser } = useStore();
  const isAr = language === 'ar';

  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (reason.trim().length < 10) {
      setErrorMsg(isAr ? 'يجب كتابة سبب واضح لا يقل عن 10 أحرف.' : 'Please provide a reason of at least 10 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: sessionData } = await supabase?.auth.getSession() || { data: { session: null } };
      const response = await fetch('/api/merchant-reports', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }, body: JSON.stringify({ merchantId, reason: reason.trim(), evidence: evidence.trim() || null }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'تعذر إرسال البلاغ.');

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Report submission error:', err);
      const msg = err?.message || '';
      if (msg.includes('24 ساعة') || msg.includes('نشط')) {
        setErrorMsg(isAr ? 'لديك بلاغ نشط مسبقاً ضد هذا التاجر خلال آخر 24 ساعة.' : 'You have already submitted a report against this merchant in the last 24h.');
      } else {
        setErrorMsg(msg || (isAr ? 'تعذر إرسال البلاغ. يرجى المحاولة لاحقاً.' : 'Failed to submit report. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#12161d] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isAr ? 'تقديم بلاغ عن تاجر' : 'Report Merchant'}
              </h3>
              <p className="text-xs text-white/40">
                {merchantName ? `${isAr ? 'التاجر المستهدف:' : 'Merchant:'} ${merchantName}` : merchantId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">
                {isAr ? 'تم استلام البلاغ بنجاح' : 'Report Submitted'}
              </h4>
              <p className="text-xs text-white/60 max-w-md mx-auto leading-relaxed">
                {isAr
                  ? 'تم استلام البلاغ وسيقوم فريق المراجعة بفحص الوقائع ومطابقتها بالسجلات. لا يتم إيقاف الحساب تلقائياً قبل التحقق.'
                  : 'Your report was received. The review team will examine the evidence before deciding on any account action.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <p className="leading-relaxed text-[11px]">
                {isAr
                  ? 'تنبيه أمني: البلاغات الكيدية تخضع للمساءلة. بمجرد تقديم بلاغ موثق، يتم تجميد صلاحيات التاجر مؤقتاً لحماية المشترين حتى انتهاء التحقيق.'
                  : 'False reports may be penalized. Reports are reviewed before any account action is taken.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80 block">
                {isAr ? 'سبب البلاغ بالتفصيل *' : 'Reason / Allegation *'}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  isAr
                    ? 'اشرح المشكلة بدقة (مثال: محتوى غير مطابق، ملف تالف، انتهاك حقوق، إلخ)...'
                    : 'Explain the issue in detail (e.g. misleading content, corrupt file, policy breach)...'
                }
                rows={4}
                required
                minLength={10}
                maxLength={1000}
                className="w-full p-3 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-rose-400"
              />
              <span className="text-[10px] text-white/40 block text-right">
                {reason.length} / 1000
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80 block">
                {isAr ? 'روابط الأدلة أو المستندات (اختياري)' : 'Evidence Links (Optional)'}
              </label>
              <input
                type="text"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder={isAr ? 'رابط لقطة شاشة أو دليل خارجي...' : 'Link to screenshot or external evidence...'}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading || reason.trim().length < 10}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-600/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isAr ? 'إرسال البلاغ الرسمي' : 'Submit Formal Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
