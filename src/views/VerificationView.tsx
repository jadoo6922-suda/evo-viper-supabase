import React, { useState } from 'react';
import { Search, ShieldCheck, CheckCircle2, XCircle, Clock, ExternalLink, QrCode } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Transaction } from '../types';

interface VerificationViewProps {
  onOpenReceiptModal: (tx: Transaction) => void;
}

export const VerificationView: React.FC<VerificationViewProps> = ({ onOpenReceiptModal }) => {
  const { verifyTransactionById, language, transactions } = useStore();
  const isAr = language === 'ar';

  const [queryInput, setQueryInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryInput.trim()) return;

    setHasSearched(true);
    const res = verifyTransactionById(queryInput.trim());
    setResult(res);
  };

  const sampleTx = transactions[0];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl mx-auto bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059] shadow-lg shadow-[#801428]/30">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {isAr ? 'مركز التحقق من صحة الإيصالات والمعاملات' : 'System Receipt Verification Center'}
        </h1>
        <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto">
          {isAr
            ? 'تحقق من صحة أي إيصال أو معاملة صادرة عن النظام المالي الداخلي عبر السجل المحاسبي غير القابل للتلاعب.'
            : 'Verify transaction legitimacy against our immutable ledger and cryptographic audit trail.'}
        </p>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleVerify}
        className="p-3 sm:p-4 rounded-2xl bg-[#12161d] border border-white/10 shadow-xl flex flex-col sm:flex-row items-center gap-3"
      >
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-white/40 absolute top-1/2 -translate-y-1/2 ltr:left-3.5 rtl:right-3.5" />
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={isAr ? 'أدخل رقم المعاملة مثل TXN-9902 أو المرجع REF-...' : 'Enter TX ID (e.g. TXN-9902) or Reference...'}
            className="w-full bg-[#141820] border border-white/5 rounded-xl py-3 ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#c5a059]/60 font-mono"
          />
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-lg transition-all cursor-pointer whitespace-nowrap"
        >
          {isAr ? 'تحقق الآن' : 'Verify Record'}
        </button>
      </form>

      {/* Quick sample chips */}
      {sampleTx && (
        <div className="flex items-center justify-center gap-2 text-xs text-white/50">
          <span>{isAr ? 'للتجربة السريعة:' : 'Quick test sample:'}</span>
          <button
            onClick={() => {
              setQueryInput(sampleTx.id);
              setHasSearched(true);
              setResult(verifyTransactionById(sampleTx.id));
            }}
            className="font-mono text-[#c5a059] hover:underline cursor-pointer"
          >
            {sampleTx.id}
          </button>
        </div>
      )}

      {/* Verification Result Card */}
      {hasSearched && (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          {result?.exists && result.transaction ? (
            <div className="rounded-2xl bg-[#0f1318] border border-emerald-500/30 p-6 md:p-8 shadow-2xl space-y-6 text-[#f7f7f9]">
              {/* Top Result Banner */}
              <div className="flex items-center justify-between pb-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                      OFFICIAL SYSTEM VERIFICATION PASS
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {isAr ? 'الإيصال صحيح ومسجل بالدفتر المالي' : 'Verified Authentic System Record'}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => onOpenReceiptModal(result.transaction)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-[#c5a059] border border-white/10 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isAr ? 'عرض الإيصال الكامل' : 'Full Receipt'}</span>
                </button>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-white/40 block">{isAr ? 'رقم المعاملة' : 'Transaction ID'}</span>
                  <span className="font-mono font-bold text-white text-sm">{result.transaction.id}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-white/40 block">{isAr ? 'المرجع النظامي' : 'System Reference'}</span>
                  <span className="font-mono font-bold text-[#c5a059] text-sm">
                    {result.transaction.reference}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-white/40 block">{isAr ? 'المبلغ المالي' : 'Transferred Amount'}</span>
                  <span className="font-bold text-white text-base">
                    {result.transaction.amount.toFixed(2)} Coins ≈ ${result.transaction.amount.toFixed(2)} USD
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-white/40 block">{isAr ? 'تاريخ ووقت المعاملة' : 'Timestamp'}</span>
                  <span className="font-mono text-white/80">
                    {new Date(result.transaction.timestamp).toUTCString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-white/40 block">{isAr ? 'المرسل' : 'Sender'}</span>
                  <span className="font-medium text-white">{result.transaction.senderName || 'System'}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-white/40 block">{isAr ? 'المستلم' : 'Recipient'}</span>
                  <span className="font-medium text-white">{result.transaction.receiverName}</span>
                </div>
              </div>

              {/* Security seal note & Public Link */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/50">
                <span className="font-mono text-[#c5a059]">
                  HMAC: {result.transaction.securityVerificationHash ? result.transaction.securityVerificationHash.substring(0, 24) + '...' : 'AUTHENTICATED'}
                </span>
                <a
                  href={`/?verify=${result.transaction.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#c5a059] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>صفحة التحقق العلنية (QR Destination)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0f1318] border border-rose-500/30 p-8 text-center space-y-3">
              <XCircle className="w-12 h-12 text-rose-400 mx-auto" />
              <h3 className="text-base font-bold text-white">
                {isAr ? 'لم يتم العثور على المعاملة في السجل المالي' : 'Transaction Record Not Found'}
              </h3>
              <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
                {isAr
                  ? 'يرجى التأكد من كتابة رقم المعاملة أو المرجع بشكل دقيق. المعاملات غير المسجلة في Ledger تعتبر غير سارية.'
                  : 'Check the transaction ID carefully. Any unlisted transaction has not been processed by the ledger.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
