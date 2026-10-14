import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface MerchantSuspendedAlertProps {
  isAr: boolean;
}

export const MerchantSuspendedAlert: React.FC<MerchantSuspendedAlertProps> = ({ isAr }) => {
  return (
    <div className="p-5 rounded-3xl bg-amber-950/40 border-2 border-amber-500/50 text-amber-200 space-y-2">
      <div className="flex items-center gap-2.5 font-black text-sm text-amber-400">
        <ShieldAlert className="w-5 h-5 text-amber-400" />
        <span>{isAr ? 'تنبيه: حسابك معلق احترازياً قيد التدقيق' : 'Account Temporarily Frozen for Review'}</span>
      </div>
      <p className="text-xs text-amber-200/80 leading-relaxed">
        {isAr
          ? 'تم تعليق الصلاحيات المالية مؤقتاً لوجود بلاغ رسمي قيد المراجعة والتحقيق من قبل فريق الإدارة. سيتم إشعارك بالنتيجة فور انتهاء التدقيق المحاسبي.'
          : 'Your merchant account has been temporarily frozen due to a pending report under administrative investigation.'}
      </p>
    </div>
  );
};
