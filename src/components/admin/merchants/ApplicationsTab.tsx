import React, { useState } from 'react';
import { MerchantApplication } from '../../../types';
import { RejectApplicationModal } from './RejectApplicationModal';
import {
  FileText,
  Search,
  ExternalLink,
  XCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface ApplicationsTabProps {
  applications: MerchantApplication[];
  isAr: boolean;
  processingId: string | null;
  onReviewApplication: (
    applicationId: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ) => Promise<void>;
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  applications,
  isAr,
  processingId,
  onReviewApplication,
}) => {
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectModalApp, setRejectModalApp] = useState<MerchantApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filteredApps = applications.filter((app) => {
    if (appFilter !== 'all' && app.status !== appFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.fullName.toLowerCase().includes(q) ||
      app.phone.includes(q) ||
      app.uid.toLowerCase().includes(q) ||
      app.businessDescription.toLowerCase().includes(q)
    );
  });

  const handleConfirmRejection = async (appId: string, reason: string) => {
    await onReviewApplication(appId, 'rejected', reason);
    setRejectModalApp(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setAppFilter(filter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                appFilter === filter
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter === 'all' && (isAr ? 'الكل' : 'All')}
              {filter === 'pending' && (isAr ? 'قيد الانتظار' : 'Pending')}
              {filter === 'approved' && (isAr ? 'مقبولة' : 'Approved')}
              {filter === 'rejected' && (isAr ? 'مرفوضة' : 'Rejected')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-white/40 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم، الهاتف، أو المعرف...' : 'Search applications...'}
            className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 rounded-xl bg-[#12161d] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
          />
        </div>
      </div>

      {filteredApps.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#12161d] border border-white/10 space-y-2">
          <FileText className="w-8 h-8 text-white/20 mx-auto" />
          <div className="text-sm font-bold text-white/60">
            {isAr ? 'لا توجد طلبات تجار تطابق التصفية الحالية' : 'No merchant applications found.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="p-6 rounded-3xl bg-[#12161d] border border-white/10 space-y-4 hover:border-white/20 transition-all"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">{app.fullName}</h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        app.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : app.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {app.status === 'approved'
                        ? isAr ? 'تمت الموافقة ✅' : 'Approved'
                        : app.status === 'rejected'
                        ? isAr ? 'مرفوض ❌' : 'Rejected'
                        : isAr ? 'قيد الانتظار ⏳' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-white/40 mt-0.5">
                    UID: {app.uid} • {app.phone}
                  </div>
                </div>

                <div className="text-right rtl:text-left text-[11px] text-white/40">
                  <div>
                    {new Date(app.submittedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {app.licensePaid && (
                    <span className="text-emerald-400 font-bold block text-[10px]">
                      {isAr ? 'تم سداد الرسوم والضمان (27 Coin)' : 'License Fee & Deposit Paid'}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-white/50 block">
                  {isAr ? 'وصف النشاط والمنتجات الرقمية:' : 'Business Description:'}
                </span>
                <p className="text-xs text-white/80 leading-relaxed bg-[#0b0d10] p-3.5 rounded-xl border border-white/5 whitespace-pre-wrap">
                  {app.businessDescription}
                </p>
              </div>

              {app.portfolioUrls && app.portfolioUrls.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-white/50 block">
                    {isAr ? 'عينات الأعمال والمرفقات:' : 'Portfolio / Samples:'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {app.portfolioUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#c5a059] flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{url.replace(/^https?:\/\//, '').slice(0, 30)}...</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {app.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <span className="font-bold block mb-0.5">{isAr ? 'سبب الرفض الموثق:' : 'Rejection Reason:'}</span>
                  {app.rejectionReason}
                </div>
              )}

              {/* Actions for Pending */}
              {app.status === 'pending' && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                  <button
                    onClick={() => {
                      setRejectModalApp(app);
                      setRejectReason('');
                    }}
                    disabled={processingId === app.id}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{isAr ? 'رفض الطلب مع ذكر السبب' : 'Reject Application'}</span>
                  </button>

                  <button
                    onClick={() => onReviewApplication(app.id, 'approved')}
                    disabled={processingId === app.id}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    {processingId === app.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{isAr ? 'قبول واعتماد الطلب' : 'Approve Application'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectModalApp && (
        <RejectApplicationModal
          app={rejectModalApp}
          isAr={isAr}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          processingId={processingId}
          onClose={() => setRejectModalApp(null)}
          onConfirm={handleConfirmRejection}
        />
      )}
    </div>
  );
};
