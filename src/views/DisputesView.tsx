import React, { useState } from 'react';
import {
  AlertTriangle,
  FileCheck,
  Upload,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  MessageSquare,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { Dispute, DisputeStatus, Transaction } from '../types';
import { useStore } from '../context/StoreContext';

export const DisputesView: React.FC = () => {
  const {
    disputes,
    transactions,
    currentUser,
    openDispute,
    adminUpdateDispute,
    verifyProofImage,
    language,
  } = useStore();

  const isAr = language === 'ar';
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Dispute Form
  const [targetTxId, setTargetTxId] = useState('');
  const [reason, setReason] = useState<Dispute['reason']>('not_received');
  const [customDesc, setCustomDesc] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ error?: string; success?: string }>({});

  const userDisputes = disputes.filter(
    (d) => isAdmin || !currentUser || d.reporterId === currentUser.id || d.respondentId === currentUser.id
  );

  const reasonLabels: Record<Dispute['reason'], { ar: string; en: string }> = {
    not_received: { ar: 'لم أستلم المنتج أو الملفات الرقمية', en: 'Did not receive digital asset' },
    different_from_desc: { ar: 'المنتج مختلف عن الوصف المذكور', en: 'Different from description' },
    transfer_missing: { ar: 'التحويل المالي لم يصل إلى المستلم', en: 'Transfer missing/uncredited' },
    unauthorized: { ar: 'عملية غير مصرح بها أو مشبوهة', en: 'Unauthorized / suspicious transaction' },
    other: { ar: 'مشكلة أخرى تتعلق بالمعاملة', en: 'Other dispute reason' },
  };

  const handleCreateDispute = async () => {
    if (!targetTxId.trim()) {
      setCreateStatus({ error: isAr ? 'يرجى تحديد رقم المعاملة.' : 'Please enter Transaction ID.' });
      return;
    }
    if (!customDesc.trim()) {
      setCreateStatus({ error: isAr ? 'يرجى كتابة تفاصيل المشكلة.' : 'Please describe the issue.' });
      return;
    }

    setIsUploading(true);
    setCreateStatus({});

    // Simulated evidence file
    const evidenceFiles = evidenceFileName
      ? [
          {
            id: 'EV-' + Math.floor(100 + Math.random() * 900),
            name: evidenceFileName,
            url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
            size: '1.4 MB',
            uploadedAt: new Date().toISOString(),
          },
        ]
      : [];

    const mockFile = new File(['mock'], evidenceFileName || 'transfer_receipt.png', {
      type: 'image/png',
    });
    const ocrResult = await verifyProofImage(mockFile, targetTxId);

    const res = await openDispute({
      transactionId: targetTxId.trim().toUpperCase(),
      reason,
      reasonLabel: isAr ? reasonLabels[reason].ar : reasonLabels[reason].en,
      description: customDesc,
      evidenceFiles,
      ocrVerification: {
        extractedAmount: ocrResult.extractedAmount,
        extractedDate: ocrResult.extractedDate,
        extractedRef: ocrResult.extractedRef,
        matchStatus: ocrResult.matchStatus,
        confidence: ocrResult.confidence,
        notes: ocrResult.notes,
      },
    });

    setIsUploading(false);
    if (res.success) {
      setCreateStatus({ success: res.message });
      setTimeout(() => {
        setShowCreateModal(false);
        setTargetTxId('');
        setCustomDesc('');
        setEvidenceFileName('');
        setCreateStatus({});
      }, 1400);
    } else {
      setCreateStatus({ error: res.message });
    }
  };

  const getStatusBadge = (status: DisputeStatus) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">Open</span>;
      case 'under_review':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">Under Review</span>;
      case 'refunded':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Refunded</span>;
      case 'resolved':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Resolved</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/70">Closed</span>;
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-[#c5a059]" />
            <span>{isAr ? 'مركز النزاعات والشكاوى ضد النصب' : 'Dispute Center & Fraud Prevention'}</span>
          </h1>
          <p className="text-xs text-white/50">
            {isAr
              ? 'نظام حماية متقدم لفحص الأدلة، قراءة الإيصالات بـ OCR، والتحقق ضد التكرار والتلاعب'
              : 'Advanced dispute arbitration with automated OCR verification and double-spend inspection'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-lg transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-[#c5a059]" />
          <span>{isAr ? 'فتح نزاع جديد' : 'Open New Dispute'}</span>
        </button>
      </div>

      {/* Disputes List */}
      {userDisputes.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#12161d] border border-white/10 text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-white/20 mx-auto" />
          <h3 className="text-sm font-bold text-white">
            {isAr ? 'سجل النزاعات نظيف تماماً' : 'No active disputes found'}
          </h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {isAr
              ? 'إذا واجهتك أي مشكلة في تسليم منتج أو عدم وصول تحويل، يمكنك فتح نزاع هنا وإرفاق صور الإثبات.'
              : 'If you face issues with a transfer or delivery, open a case here with proof attachments.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#12161d] border border-white/10 overflow-hidden divide-y divide-white/5">
          {userDisputes.map((dispute) => (
            <div
              key={dispute.id}
              onClick={() => setSelectedDispute(dispute)}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-[#c5a059]">#{dispute.id}</span>
                  {getStatusBadge(dispute.status)}
                  <span className="text-[11px] text-white/40">
                    {isAr ? 'المعاملة:' : 'TX:'} {dispute.transactionId}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{dispute.reasonLabel}</h3>
                <p className="text-xs text-white/50 line-clamp-1">{dispute.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-white/40 pt-1">
                  <span>{isAr ? 'مقدم النزاع:' : 'Reporter:'} {dispute.reporterName}</span>
                  <span>•</span>
                  <span>{new Date(dispute.createdAt).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                <div className="text-right rtl:text-left">
                  <span className="text-xs text-white/40 block">{isAr ? 'المبلغ المتنازع عليه' : 'Dispute Amount'}</span>
                  <span className="text-base font-extrabold text-white">{dispute.amount} Coins</span>
                </div>

                <span className="text-xs text-[#c5a059] font-medium flex items-center gap-1 hover:underline">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isAr ? 'معاينة الأدلة' : 'Inspect Case'}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE DISPUTE MODAL */}
      {showCreateModal && (
        <div
          id="create-dispute-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl bg-[#0f1318] border border-white/10 p-6 md:p-8 shadow-2xl text-[#f7f7f9] space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <AlertTriangle className="w-8 h-8 text-[#c5a059] mx-auto" />
              <h3 className="text-lg font-bold text-white">
                {isAr ? 'فتح نزاع مالي جديد' : 'File a New Dispute'}
              </h3>
              <p className="text-xs text-white/50">
                {isAr ? 'أدخل رقم المعاملة وأرفق أدلة الإثبات للتدقيق' : 'Specify transaction and attach evidence'}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Transaction ID */}
              <div className="space-y-1.5">
                <label className="font-semibold text-white/70 block">
                  {isAr ? 'رقم المعاملة (Transaction ID):' : 'Transaction ID:'}
                </label>
                <input
                  type="text"
                  value={targetTxId}
                  onChange={(e) => setTargetTxId(e.target.value)}
                  placeholder="مثال: TXN-9902"
                  className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#c5a059]/60"
                />
              </div>

              {/* Reason selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-white/70 block">
                  {isAr ? 'سبب النزاع:' : 'Dispute Reason:'}
                </label>
                <select
                  value={reason}
                  onChange={(e: any) => setReason(e.target.value)}
                  className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a059]/60"
                >
                  {Object.entries(reasonLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {isAr ? label.ar : label.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-semibold text-white/70 block">
                  {isAr ? 'شرح مفصل للمشكلة والأدلة:' : 'Detailed Explanation:'}
                </label>
                <textarea
                  rows={3}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder={isAr ? 'وضح ما حدث بالتفصيل وما تم الاتفاق عليه...' : 'Describe what happened in detail...'}
                  className="w-full bg-[#141820] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#c5a059]/60"
                />
              </div>

              {/* Evidence file simulation */}
              <div className="space-y-1.5">
                <label className="font-semibold text-white/70 block">
                  {isAr ? 'إرفاق صورة إثبات / سكرين شوت (OCR):' : 'Attach Proof Screenshot (Scanned via OCR):'}
                </label>
                <div className="border border-dashed border-white/15 rounded-xl p-4 text-center space-y-2 bg-white/[0.01]">
                  <Upload className="w-5 h-5 text-[#c5a059] mx-auto" />
                  <span className="text-[11px] text-white/60 block">
                    {evidenceFileName || (isAr ? 'اضغط لاختيار صورة الإيصال' : 'Click to select proof receipt image')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setEvidenceFileName(e.target.files[0].name);
                    }}
                    className="text-xs text-white/40"
                  />
                </div>
              </div>

              {createStatus.error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {createStatus.error}
                </div>
              )}

              {createStatus.success && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{createStatus.success}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleCreateDispute}
                  disabled={isUploading}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUploading
                    ? (isAr ? 'جاري فحص الأدلة بـ OCR وفتح القضية...' : 'Analyzing Evidence & Opening Case...')
                    : (isAr ? 'تقديم النزاع للمراجعة' : 'Submit Dispute')}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="py-3 px-5 rounded-xl text-xs text-white/70 hover:text-white bg-white/5"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE DETAILS MODAL */}
      {selectedDispute && (
        <div
          id="view-dispute-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setSelectedDispute(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-2xl bg-[#0f1318] border border-white/10 p-6 md:p-8 shadow-2xl text-[#f7f7f9] space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setSelectedDispute(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#c5a059]">
                    #{selectedDispute.id}
                  </span>
                  {getStatusBadge(selectedDispute.status)}
                </div>
                <h3 className="text-base font-bold text-white">{selectedDispute.reasonLabel}</h3>
                <span className="text-xs text-white/40 block">
                  {isAr ? 'المعاملة المقيدة بالدفتر:' : 'Ledger Transaction ID:'}{' '}
                  <span className="font-mono text-white/80">{selectedDispute.transactionId}</span>
                </span>
              </div>

              <div className="text-right rtl:text-left bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-white/40 block">{isAr ? 'المبلغ' : 'Amount'}</span>
                <span className="text-lg font-black text-white">{selectedDispute.amount} Coins</span>
              </div>
            </div>

            {/* Narrative description */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#c5a059] uppercase tracking-wider">
                {isAr ? 'بيان الشكوى من المستخدم' : 'Dispute Claim Statement'}
              </h4>
              <p className="text-xs text-white/80 bg-white/[0.02] p-3.5 rounded-xl border border-white/5 leading-relaxed">
                {selectedDispute.description}
              </p>
            </div>

            {/* Evidence & OCR analysis block */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#c5a059] uppercase tracking-wider">
                {isAr ? 'الأدلة ونتائج فحص OCR للنظام' : 'Evidence & Automated OCR Inspection'}
              </h4>

              {selectedDispute.evidenceFiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedDispute.evidenceFiles.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-4 h-4 text-[#c5a059] shrink-0" />
                        <span className="truncate text-white/80">{ev.name}</span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono shrink-0">{ev.size}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-white/40">{isAr ? 'لم يتم إرفاق ملفات إضافية' : 'No extra files attached'}</span>
              )}

              {/* OCR Verdict Box */}
              {selectedDispute.ocrVerification && (
                <div className="p-4 rounded-xl bg-[#141922] border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {isAr ? 'نتيجة الفحص الآلي للإيصال:' : 'Automated Verification Verdict:'}
                    </span>
                    <span className="font-bold text-emerald-400 capitalize">
                      {selectedDispute.ocrVerification.matchStatus.replace('_', ' ')} (
                      {selectedDispute.ocrVerification.confidence}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    {selectedDispute.ocrVerification.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Admin Notes */}
            {selectedDispute.adminNotes && (
              <div className="p-3.5 rounded-xl bg-[#801428]/10 border border-[#801428]/30 space-y-1 text-xs">
                <span className="font-semibold text-[#c5a059] block">
                  {isAr ? 'ملاحظات الإدارة والتحقيق:' : 'Admin Arbitration Notes:'}
                </span>
                <p className="text-white/80 leading-relaxed">{selectedDispute.adminNotes}</p>
              </div>
            )}

            {/* Admin Decisions Actions if Admin */}
            {isAdmin && selectedDispute.status !== 'refunded' && selectedDispute.status !== 'closed' && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <span className="text-xs font-bold text-white block">
                  {isAr ? 'إجراءات الإدارة والتحكيم المالي:' : 'Admin Arbitration Controls:'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={async () => {
                      const result = await adminUpdateDispute(selectedDispute.id, 'refunded', 'تم قبول النزاع بعد التحقق من صحة الأدلة وإعادة الرصيد للمشتري.', true);
                      if (result.success) setSelectedDispute(null); else window.alert(result.message || (isAr ? 'تعذر تنفيذ الاسترداد.' : 'Refund could not be completed.'));
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    {isAr ? 'قبول النزاع واسترداد الرصيد للمشتري (Refund)' : 'Accept & Refund Buyer'}
                  </button>

                  <button
                    onClick={async () => {
                      const result = await adminUpdateDispute(selectedDispute.id, 'rejected', 'تم رفض النزاع لعدم كفاية الأدلة أو ثبوت استلام المنتج.', false);
                      if (result.success) setSelectedDispute(null); else window.alert(result.message || (isAr ? 'تعذر تحديث النزاع.' : 'Could not update dispute.'));
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer"
                  >
                    {isAr ? 'رفض النزاع (Reject)' : 'Reject Dispute'}
                  </button>

                  <button
                    onClick={async () => {
                      const result = await adminUpdateDispute(selectedDispute.id, 'resolved', 'تم حل النزاع ودياً وتسليم الملفات المطلوبة.', false);
                      if (result.success) setSelectedDispute(null); else window.alert(result.message || (isAr ? 'تعذر تحديث النزاع.' : 'Could not update dispute.'));
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    {isAr ? 'إغلاق القضية كـ محلولة (Resolved)' : 'Mark Resolved'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
