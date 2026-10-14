import React from 'react';
import { MerchantApplication } from '../../../types';

interface RejectApplicationModalProps {
  app: MerchantApplication;
  isAr: boolean;
  rejectReason: string;
  setRejectReason: (val: string) => void;
  processingId: string | null;
  onClose: () => void;
  onConfirm: (appId: string, reason: string) => void;
}

export const RejectApplicationModal: React.FC<RejectApplicationModalProps> = ({
  app,
  isAr,
  rejectReason,
  setRejectReason,
  processingId,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-[#12161d] border border-white/10 p-6 space-y-4 shadow-2xl">
        <h4 className="text-base font-bold text-white">
          {isAr ? 'رفض طلب التاجر' : 'Reject Merchant Application'}
        </h4>
        <p className="text-xs text-white/60">
          {isAr
            ? `طلب: ${app.fullName}. يرجى توضيح سبب الرفض ليتم إبلاغ المتقدم به بدقة.`
            : `Application for ${app.fullName}. Please state the reason.`}
        </p>

        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={isAr ? 'سبب الرفض (5 أحرف على الأقل)...' : 'Rejection reason...'}
          rows={3}
          className="w-full p-3 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-rose-400"
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={() => onConfirm(app.id, rejectReason.trim())}
            disabled={rejectReason.trim().length < 5 || processingId === app.id}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {isAr ? 'تأكيد الرفض' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
};
