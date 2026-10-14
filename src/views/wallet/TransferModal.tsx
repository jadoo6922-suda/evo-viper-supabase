import React, { useState } from 'react';
import {
  ArrowUpRight,
  X,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { Transaction, User } from '../../types';

interface TransferModalProps {
  isAr: boolean;
  balance: number;
  currentUser: User | null;
  onClose: () => void;
  onSuccess: (receipt: Transaction) => void;
  sendTransfer: (args: {
    recipientIdOrCode: string;
    amount: number;
    pinOrPassword?: string;
    description?: string;
  }) => { success: boolean; message: string; receipt?: Transaction };
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isAr,
  balance,
  currentUser,
  onClose,
  onSuccess,
  sendTransfer,
}) => {
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferPin, setTransferPin] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferStep, setTransferStep] = useState<'input' | 'confirm'>('input');
  const [transferStatus, setTransferStatus] = useState<{
    loading: boolean;
    error?: string;
    success?: string;
  }>({ loading: false });

  const handleTransferSubmit = () => {
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) {
      setTransferStatus({
        loading: false,
        error: isAr ? 'يرجى إدخال مبلغ تحويل صحيح.' : 'Enter a valid transfer amount.',
      });
      return;
    }
    if (amt > balance) {
      setTransferStatus({
        loading: false,
        error: isAr ? 'الرصيد المتاح غير كافٍ.' : 'Insufficient wallet balance.',
      });
      return;
    }

    setTransferStatus({ loading: true });
    setTimeout(async () => {
      const res = await sendTransfer({
        recipientIdOrCode: transferRecipient,
        amount: amt,
        pinOrPassword: transferPin,
        description: transferDesc,
      });

      if (res.success && res.receipt) {
        setTransferStatus({ loading: false, success: res.message });
        setTimeout(() => {
          onClose();
          setTransferStep('input');
          setTransferAmount('');
          setTransferRecipient('');
          setTransferPin('');
          if (res.receipt) onSuccess(res.receipt);
        }, 500);
      } else {
        setTransferStatus({ loading: false, error: res.message });
      }
    }, 700);
  };

  return (
    <div
      id="transfer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-[#0f1318] border border-[#801428]/60 p-6 shadow-2xl text-[#f7f7f9] space-y-5 animate-in fade-in zoom-in-95"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-11 h-11 rounded-xl mx-auto bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059]">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {isAr ? 'تحويل مالي إلى شخص' : 'Transfer Coins to User'}
          </h3>
          <p className="text-xs text-white/50">
            {isAr ? 'التحويل مقيد بالدفتر المحاسبي ويصدر له إيصال موثق' : 'Recorded atomically in the ledger with verified receipt'}
          </p>
        </div>

        {transferStep === 'input' ? (
          <div className="space-y-4">
            {/* Recipient Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70 block">
                {isAr ? 'معرّف المستلم / رمز التحويل المؤقت:' : 'Recipient User ID or Transfer Code:'}
              </label>
              <input
                type="text"
                value={transferRecipient}
                onChange={(e) => setTransferRecipient(e.target.value)}
                placeholder="مثال: USR-61943 أو TRF-SAR-7731"
                className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#c5a059]/60 font-mono"
              />
              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-white/40">
                <span>{isAr ? 'أو اختر للتجربة:' : 'Quick Select:'}</span>
                <button
                  type="button"
                  onClick={() => setTransferRecipient('USR-61943')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#c5a059] cursor-pointer"
                >
                  سارة (USR-61943)
                </button>
                <button
                  type="button"
                  onClick={() => setTransferRecipient('USR-90214')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#c5a059] cursor-pointer"
                >
                  خالد (USR-90214)
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-white/70">
                  {isAr ? 'المبلغ (Coins):' : 'Amount (Coins):'}
                </label>
                <span className="text-white/40">
                  {isAr ? 'المتاح:' : 'Available:'} {balance} Coins
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  max={balance}
                  className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-[#c5a059]/60 font-mono"
                />
                <span className="absolute top-1/2 -translate-y-1/2 ltr:right-3.5 rtl:left-3.5 text-xs font-semibold text-[#c5a059]">
                  Coins
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70 block">
                {isAr ? 'ملاحظات المعاملة (اختياري):' : 'Note (Optional):'}
              </label>
              <input
                type="text"
                value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)}
                placeholder={isAr ? 'دفعة مقابل تصميم / خدمة برمجية...' : 'Payment for design/code service...'}
                className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#c5a059]/60"
              />
            </div>

            {transferStatus.error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {transferStatus.error}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const amt = parseFloat(transferAmount);
                if (!transferRecipient.trim()) {
                  setTransferStatus({
                    loading: false,
                    error: isAr ? 'يرجى إدخال المستلم.' : 'Please enter a recipient.',
                  });
                  return;
                }
                if (!amt || amt <= 0 || amt > balance) {
                  setTransferStatus({
                    loading: false,
                    error: isAr ? 'يرجى إدخال مبلغ صالح متاح.' : 'Please enter a valid amount.',
                  });
                  return;
                }
                setTransferStatus({ loading: false });
                setTransferStep('confirm');
              }}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-lg transition-all cursor-pointer"
            >
              {isAr ? 'متابعة إلى شاشة التأكيد' : 'Continue to Confirmation'}
            </button>
          </div>
        ) : (
          /* Step 2: Confirmation & Step-up Verification (Mandatory in spec: Recipient, Amount, Your Balance, Balance After Transfer) */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2.5 text-xs">
              <div className="flex justify-between text-white/60">
                <span>{isAr ? 'المستلم:' : 'Recipient:'}</span>
                <span className="font-bold text-white font-mono">{transferRecipient}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>{isAr ? 'مبلغ التحويل:' : 'Transfer Amount:'}</span>
                <span className="font-bold text-white">{parseFloat(transferAmount)} Coins</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>{isAr ? 'رصيدك الحالي:' : 'Your Balance:'}</span>
                <span className="font-bold text-[#c5a059]">{balance} Coins</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                <span className="text-white/80">{isAr ? 'الرصيد بعد التحويل:' : 'Balance After Transfer:'}</span>
                <span className="text-emerald-400">
                  {(balance - parseFloat(transferAmount)).toFixed(2)} Coins
                </span>
              </div>
            </div>

            {/* Step-Up Verification (Transfer PIN) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-white/80">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>{isAr ? 'رمز PIN لتأكيد التحويل:' : 'Transfer Authorization PIN:'}</span>
                </div>
                {(currentUser?.hasPinSet || currentUser?.transferPin) && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {isAr ? 'محمي برمز PIN' : 'PIN Protected'}
                  </span>
                )}
              </div>
              <input
                type="password"
                inputMode="numeric"
                value={transferPin}
                onChange={(e) => setTransferPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                maxLength={6}
                className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]/60 font-mono text-center tracking-widest"
              />
              <span className="text-[10px] text-white/40 block">
                {isAr
                  ? 'أدخل رمز PIN السري الخاص بحسابك والمُعيّن عند تسجيل الدخول لتأكيد التحويل'
                  : 'Enter the secret PIN configured on your account to authorize this transfer'}
              </span>
            </div>

            {transferStatus.error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {transferStatus.error}
              </div>
            )}

            {transferStatus.success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{transferStatus.success}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTransferSubmit}
                disabled={transferStatus.loading}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {transferStatus.loading
                  ? (isAr ? 'جاري القيد بالدفتر المحاسبي...' : 'Processing Ledger Transfer...')
                  : (isAr ? 'تأكيد التحويل الآن' : 'Confirm Transfer')}
              </button>
              <button
                type="button"
                onClick={() => setTransferStep('input')}
                disabled={transferStatus.loading}
                className="py-3 px-4 rounded-xl text-xs text-white/70 hover:text-white bg-white/5 transition-colors cursor-pointer"
              >
                {isAr ? 'تعديل' : 'Back'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
