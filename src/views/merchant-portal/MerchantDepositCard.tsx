import React from 'react';
import { Lock } from 'lucide-react';
import { MerchantDeposit } from '../../types';

interface MerchantDepositCardProps {
  isAr: boolean;
  myDeposit: MerchantDeposit | null;
}

export const MerchantDepositCard: React.FC<MerchantDepositCardProps> = ({ isAr, myDeposit }) => {
  return (
    <div className="p-6 rounded-3xl bg-[#12161d] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">
            {isAr ? 'الضمان المالي المحجوز (Security Deposit)' : 'Security Bond'}
          </h4>
          <p className="text-xs text-white/50">
            {isAr
              ? '25 Coin محجوزة كضمان للنزاهة، وتُسترجع تلقائياً لمحفظتك بعد 30 يوماً من الانضمام.'
              : '25 Coins held as a security bond, auto-refunded to your wallet after 30 days.'}
          </p>
        </div>
      </div>

      <div className="text-right rtl:text-left">
        <div className="text-lg font-black text-amber-400">25 Coins</div>
        <span className="text-[10px] text-white/40 block">
          {myDeposit?.refundableAt
            ? `${isAr ? 'تاريخ الاسترداد:' : 'Due:'} ${new Date(myDeposit.refundableAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}`
            : isAr ? 'قيد المعالجة' : 'Active'}
        </span>
      </div>
    </div>
  );
};
