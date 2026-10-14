import React from 'react';
import { MerchantReport } from '../../../types';
import { ShieldAlert, CheckCircle2, Loader2, Ban } from 'lucide-react';

interface ReportsTabProps {
  reports: MerchantReport[];
  isAr: boolean;
  processingId: string | null;
  onResolveReport: (reportId: string, decision: 'upheld' | 'dismissed') => Promise<void>;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  reports,
  isAr,
  processingId,
  onResolveReport,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-rose-900/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
        <p className="leading-relaxed">
          {isAr
            ? 'عند تأييد البلاغ: يتم سحب رخصة التاجر نهائياً، مصادرة مبلغ الضمان الـ 25 Coin لصالح احتياطي الإدارة، وحظر حسابه وإلغاء نشر جميع منتجاته.'
            : 'Upheld reports revoke merchant license, ban account, forfeit the 25 Coin deposit, and unpublish products.'}
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#12161d] border border-white/10 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto" />
          <div className="text-sm font-bold text-white/60">
            {isAr ? 'لا توجد بلاغات على التجار حالياً. النظام آمن!' : 'No merchant reports recorded.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="p-6 rounded-3xl bg-[#12161d] border border-white/10 space-y-4 hover:border-white/20 transition-all"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-400">
                      {rep.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        rep.status === 'upheld'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : rep.status === 'dismissed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {rep.status === 'upheld'
                        ? isAr ? 'تم تأييد البلاغ (سحب الرخصة)' : 'Upheld'
                        : rep.status === 'dismissed'
                        ? isAr ? 'مرفوض (إعادة التفعيل)' : 'Dismissed'
                        : isAr ? 'قيد المراجعة والتحقيق' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-xs text-white/60 mt-0.5">
                    {isAr ? 'المُشتكي:' : 'Reporter:'} <span className="font-mono text-white/80">{rep.reporterId}</span> • {isAr ? 'التاجر المشكو عليه:' : 'Merchant:'} <span className="font-mono text-amber-300 font-bold">{rep.merchantId}</span>
                  </div>
                </div>

                <div className="text-right rtl:text-left text-[11px] text-white/40 font-mono">
                  {new Date(rep.createdAt).toLocaleString(isAr ? 'ar-SA' : 'en-US')}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-white/40 block">
                  {isAr ? 'سبب ومضمون البلاغ:' : 'Report Details:'}
                </span>
                <p className="text-xs text-white/90 bg-[#0b0d10] p-3.5 rounded-xl border border-white/5 leading-relaxed">
                  {rep.reason}
                </p>
              </div>

              {rep.evidence && (
                <div className="text-xs text-white/60">
                  <span className="font-bold text-white/40 block mb-1">{isAr ? 'رابط الدليل المرفق:' : 'Evidence:'}</span>
                  <a
                    href={rep.evidence}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c5a059] hover:underline break-all"
                  >
                    {rep.evidence}
                  </a>
                </div>
              )}

              {/* Actions for Pending Reports */}
              {rep.status === 'pending_review' && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                  <button
                    onClick={() => onResolveReport(rep.id, 'dismissed')}
                    disabled={processingId === rep.id}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isAr ? 'رفض البلاغ (إعادة تفعيل الحساب)' : 'Dismiss Report'}
                  </button>

                  <button
                    onClick={() => onResolveReport(rep.id, 'upheld')}
                    disabled={processingId === rep.id}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                  >
                    {processingId === rep.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                    <span>{isAr ? 'تأييد البلاغ (سحب الرخصة ومصادرة الضمان)' : 'Uphold & Forfeit Deposit'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
