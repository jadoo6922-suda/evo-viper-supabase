import React from 'react';
import {
  Clock,
  XCircle,
  CheckCircle2,
  DollarSign,
  Loader2,
  Send,
} from 'lucide-react';
import { MerchantApplication } from '../../types';

interface MerchantApplicationStatusProps {
  isAr: boolean;
  application: MerchantApplication;
  userBalance: number;
  actionLoading: boolean;
  activationTokenInput: string;
  setActivationTokenInput: (token: string) => void;
  onPayFee: () => Promise<void>;
  onSendActivationLink: () => Promise<void>;
  onVerifyActivation: () => Promise<void>;
  onResetApplication: () => void;
  onNavigateToWallet?: () => void;
}

export const MerchantApplicationStatus: React.FC<MerchantApplicationStatusProps> = ({
  isAr,
  application,
  userBalance,
  actionLoading,
  activationTokenInput,
  setActivationTokenInput,
  onPayFee,
  onSendActivationLink,
  onVerifyActivation,
  onResetApplication,
  onNavigateToWallet,
}) => {
  if (application.status === 'pending') {
    return (
      <div className="p-8 rounded-3xl bg-[#12161d] border border-amber-500/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
          <Clock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">
            {isAr ? 'طلبك قيد التدقيق الإداري' : 'Application Under Review'}
          </h3>
          <p className="text-xs text-white/60 max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'تم استلام طلبك ومرفقاتك بنجاح. سيقوم فريق الإدارة بمراجعته والتحقق من النزاهة خلال وقت قصير.'
              : 'Your merchant application has been submitted and is currently being audited by administration.'}
          </p>
        </div>
        <div className="text-[11px] font-mono text-white/40">
          {isAr ? 'تاريخ التقديم:' : 'Submitted:'} {new Date(application.submittedAt).toLocaleString(isAr ? 'ar-SA' : 'en-US')}
        </div>
      </div>
    );
  }

  if (application.status === 'rejected') {
    return (
      <div className="p-8 rounded-3xl bg-[#12161d] border border-rose-500/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <XCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">
            {isAr ? 'لم تتم الموافقة على الطلب' : 'Application Not Approved'}
          </h3>
          <p className="text-xs text-rose-300 max-w-md mx-auto leading-relaxed">
            {application.rejectionReason || (isAr ? 'لم يستوفِ الشروط المعتمدة.' : 'Requirements not met.')}
          </p>
        </div>
        <button
          onClick={onResetApplication}
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors cursor-pointer"
        >
          {isAr ? 'تقديم طلب جديد' : 'Submit New Application'}
        </button>
      </div>
    );
  }

  if (application.status === 'approved') {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-[#12161d] border border-emerald-500/30 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">
                {isAr ? 'تمت الموافقة على طلبك! استكمل سداد الرسوم والتفعيل' : 'Approved! Complete Payment & Activation'}
              </h4>
              <p className="text-xs text-white/50">
                {isAr
                  ? 'خطوة أخيرة: سداد رسوم الترخيص وحجز الضمان عبر الدفتر المحاسبي.'
                  : 'Final step: Pay license fee and security deposit via double-entry ledger.'}
              </p>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="p-4 rounded-2xl bg-[#0b0d10] border border-white/5 space-y-3 text-xs">
            <div className="flex items-center justify-between text-white/80">
              <span>{isAr ? 'رسوم الترخيص الرسمية (License Fee)' : 'Official License Fee'}</span>
              <span className="font-mono font-bold text-white">2 Coins</span>
            </div>
            <div className="flex items-center justify-between text-white/80">
              <span>{isAr ? 'مبلغ الضمان المحجوز (مسترد تلقائياً بعد 30 يوم)' : 'Security Deposit (Auto-refunded in 30d)'}</span>
              <span className="font-mono font-bold text-amber-300">25 Coins</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10 font-bold text-white">
              <span>{isAr ? 'الإجمالي المطلوب دفعه' : 'Total Required'}</span>
              <span className="font-mono text-[#c5a059] text-sm">27 Coins</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/60">
            <span>{isAr ? 'رصيدك الحالي بالمحفظة:' : 'Your Wallet Balance:'}</span>
            <span className="font-mono font-bold text-amber-400">{userBalance} Coins</span>
          </div>

          {/* Button to Pay */}
          {!application.licensePaid ? (
            <div className="space-y-3">
              {userBalance < 27 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                  <span>{isAr ? 'رصيدك غير كافٍ لسداد الـ 27 Coin.' : 'Insufficient balance.'}</span>
                  {onNavigateToWallet && (
                    <button
                      onClick={onNavigateToWallet}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold"
                    >
                      {isAr ? 'شحن الرصيد' : 'Deposit'}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={onPayFee}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#c5a059] to-[#9b7b37] hover:brightness-110 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#c5a059]/20"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4" />
                  )}
                  <span>{isAr ? 'سداد الرسوم وحجز الضمان (27 Coin) عبر الدفتر' : 'Pay 27 Coins via Ledger'}</span>
                </button>
              )}
            </div>
          ) : (
            /* Section 3: Activation Token Flow */
            <div className="p-5 rounded-2xl bg-[#0b0d10] border border-white/10 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-400 block">
                  {isAr ? 'تم سداد الرسوم وحجز الضمان بنجاح! ✅' : 'Payment Completed! ✅'}
                </span>
                <p className="text-xs text-white/60 leading-relaxed">
                  {isAr
                    ? 'لتفعيل حسابك التجاري بأعلى درجات الأمان، سنرسل رابطاً مشفراً لبريدك الإلكتروني، أو يمكنك لصق رمز التفعيل أدناه.'
                    : 'To activate your account securely, request an activation link to your email or paste your token below.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onSendActivationLink}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-cyan-400" />}
                  <span>{isAr ? 'إرسال رابط التفعيل لبريدي' : 'Send Activation Link'}</span>
                </button>

                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={activationTokenInput}
                    onChange={(e) => setActivationTokenInput(e.target.value)}
                    placeholder={isAr ? 'أو الصق رمز التفعيل (Token)...' : 'Paste activation token...'}
                    className="flex-1 px-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
                  />
                  <button
                    onClick={onVerifyActivation}
                    disabled={!activationTokenInput.trim() || actionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {isAr ? 'تأكيد' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
