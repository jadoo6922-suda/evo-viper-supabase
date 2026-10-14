import React from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  AlertTriangle,
  Clock,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface WalletBalanceCardProps {
  balance: number;
  isAr: boolean;
  activeCodeString: string;
  timeLeftSeconds: number;
  formatCountdown: (secs: number) => string;
  onOpenTransfer: () => void;
  onOpenReceive: () => void;
  onOpenTopUp: () => void;
  onOpenProofVerification: () => void;
  onNavigateToDisputes: () => void;
  onGenerateFreshCode: () => void;
}

export const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({
  balance,
  isAr,
  activeCodeString,
  timeLeftSeconds,
  formatCountdown,
  onOpenTransfer,
  onOpenReceive,
  onOpenTopUp,
  onOpenProofVerification,
  onNavigateToDisputes,
  onGenerateFreshCode,
}) => {
  return (
    <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#151a22] via-[#10141a] to-[#0d0f13] border border-white/10 p-6 sm:p-8 md:p-10 shadow-2xl text-[#f7f7f9]">
      {/* Subtle Burgundy Aura */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#801428]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            {isAr ? 'الرصيد المتاح بالمحفظة' : 'Available Wallet Balance'}
          </span>
          <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight flex items-baseline gap-3">
            <span>${balance.toFixed(2)}</span>
            <span className="text-lg sm:text-xl font-bold text-[#c5a059]">
              {balance} Coins
            </span>
          </div>
          <p className="text-xs text-[#c5a059]/80 font-mono">
            {isAr
              ? 'قاعدة النظام: 1 Coin = 1.00 USD • قيد مزدوج في Ledger'
              : 'Core Protocol: 1 Coin = 1.00 USD • Double-entry Ledger protected'}
          </p>
        </div>

        {/* Quick Action Buttons (As requested: [تحويل] [استقبال] [سجل العمليات] [شحن الرصيد] [النزاعات]) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenTransfer}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-lg shadow-[#801428]/25 hover:shadow-[#801428]/40 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-[#c5a059]" />
            <span>{isAr ? 'تحويل' : 'Transfer'}</span>
          </button>

          <button
            onClick={onOpenReceive}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-[#c5a059]" />
            <span>{isAr ? 'استقبال' : 'Receive'}</span>
          </button>

          <button
            onClick={onOpenTopUp}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'شحن الرصيد' : 'Top Up'}</span>
          </button>

          <button
            onClick={onOpenProofVerification}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            <FileCheck className="w-4 h-4 text-[#c5a059]" />
            <span>{isAr ? 'فحص إثبات الدفع' : 'Verify Proof'}</span>
          </button>

          <button
            onClick={onNavigateToDisputes}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'النزاعات' : 'Disputes'}</span>
          </button>
        </div>
      </div>

      {/* 10-Minute Expiring Transfer Code Pill Banner */}
      <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#c5a059]" />
          </div>
          <div>
            <span className="text-[11px] text-white/50 block">
              {isAr ? 'رمز التحويل المؤقت (صالح لمرة واحدة لمدة 10 دقائق):' : 'Temporary 10-Min Transfer Code (Single-use):'}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-[#c5a059] tracking-wider">
                {activeCodeString || 'TRF-AHM-4412'}
              </span>
              <span
                className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                  timeLeftSeconds < 60 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/80'
                }`}
              >
                {timeLeftSeconds > 0 ? (
                  `${isAr ? 'ينتهي خلال' : 'Expires in'} ${formatCountdown(timeLeftSeconds)}`
                ) : (
                  <span className="text-red-400">{isAr ? 'منتهي الصلاحية' : 'Expired'}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onGenerateFreshCode}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/70 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isAr ? 'توليد رمز جديد' : 'New Code'}</span>
        </button>
      </div>
    </section>
  );
};
