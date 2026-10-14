import React from 'react';
import { MerchantDeposit, User } from '../../../types';
import { RefreshCw, Loader2 } from 'lucide-react';

interface DepositsTabProps {
  deposits: MerchantDeposit[];
  users: User[];
  isAr: boolean;
  processingId: string | null;
  onTriggerDepositRefund: () => Promise<void>;
}

export const DepositsTab: React.FC<DepositsTabProps> = ({
  deposits,
  users,
  isAr,
  processingId,
  onTriggerDepositRefund,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#12161d] border border-white/10">
        <div>
          <h4 className="text-sm font-bold text-white">
            {isAr ? 'محفظة الضمانات المحجوزة (+30 يوم)' : 'Held Security Deposits Pool'}
          </h4>
          <p className="text-xs text-white/50">
            {isAr
              ? 'يتم حجز 25 Coin تلقائياً عند الدفع. وتُسترجع تلقائياً بعد 30 يوماً ما لم يتم تأييد بلاغ بمصادرتها.'
              : 'Deposits are held for 30 days and automatically refunded to user balance unless forfeited.'}
          </p>
        </div>
        <button
          onClick={onTriggerDepositRefund}
          disabled={processingId === 'deposit_refund'}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#9b7b37] text-black text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
        >
          {processingId === 'deposit_refund' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>{isAr ? 'فحص وإرجاع الضمانات المستحقة فوراً' : 'Run Due Refunds Now'}</span>
        </button>
      </div>

      <div className="rounded-3xl bg-[#12161d] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">{isAr ? 'التاجر / المستخدم' : 'Merchant'}</th>
                <th className="p-4">{isAr ? 'مبلغ الضمان' : 'Deposit'}</th>
                <th className="p-4">{isAr ? 'تاريخ الحجز' : 'Held At'}</th>
                <th className="p-4">{isAr ? 'تاريخ الاستحقاق (+30 يوم)' : 'Refund Due Date'}</th>
                <th className="p-4">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/40">
                    {isAr ? 'لا توجد ضمانات مسجلة حتى الآن.' : 'No deposits recorded yet.'}
                  </td>
                </tr>
              ) : (
                deposits.map((dep) => {
                  const userObj = users.find((u) => u.id === dep.uid);
                  const isDue = new Date(dep.refundableAt).getTime() <= Date.now();
                  return (
                    <tr key={dep.uid} className="hover:bg-white/[0.02]">
                      <td className="p-4">
                        <div className="font-bold text-white">
                          {userObj?.displayName || dep.uid}
                        </div>
                        <div className="text-[10px] font-mono text-white/40">{dep.uid}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-amber-300">
                        {dep.amount} Coins
                      </td>
                      <td className="p-4 text-white/70 font-mono">
                        {new Date(dep.heldAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                      </td>
                      <td className="p-4 font-mono">
                        <span className={isDue && dep.status === 'held' ? 'text-amber-400 font-bold' : 'text-white/70'}>
                          {new Date(dep.refundableAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                        </span>
                        {isDue && dep.status === 'held' && (
                          <span className="block text-[10px] text-amber-400 font-sans">
                            {isAr ? 'مستحق للإرجاع' : 'Due for refund'}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            dep.status === 'held'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : dep.status === 'refunded'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {dep.status === 'held'
                            ? isAr ? 'محجوز 🔒' : 'Held'
                            : dep.status === 'refunded'
                            ? isAr ? 'مسترد للمحفظة ✅' : 'Refunded'
                            : isAr ? 'مصادر للإدارة ⚠️' : 'Forfeited'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
