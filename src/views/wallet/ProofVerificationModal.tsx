import React, { useState } from 'react';
import { X, FileCheck, Upload } from 'lucide-react';

interface ProofVerificationModalProps {
  isAr: boolean;
  onClose: () => void;
  verifyProofImage: (file: File, expectedTxId?: string) => Promise<any>;
}

export const ProofVerificationModal: React.FC<ProofVerificationModalProps> = ({
  isAr,
  onClose,
  verifyProofImage,
}) => {
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [proofExpectedTxId, setProofExpectedTxId] = useState('');
  const [isVerifyingProof, setIsVerifyingProof] = useState(false);
  const [proofResult, setProofResult] = useState<any>(null);

  const handleFileDropOrSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedProofFile(e.target.files[0]);
      setProofResult(null);
    }
  };

  const handleRunProofVerification = async () => {
    if (!selectedProofFile) return;
    setIsVerifyingProof(true);
    try {
      const result = await verifyProofImage(selectedProofFile, proofExpectedTxId || undefined);
      setProofResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifyingProof(false);
    }
  };

  return (
    <div
      id="proof-verification-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-2xl bg-[#0f1318] border border-white/10 p-6 md:p-8 shadow-2xl text-[#f7f7f9] space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-11 h-11 rounded-xl mx-auto bg-[#801428]/30 border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059]">
            <FileCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {isAr ? 'نظام التحقق الآلي من إثباتات التحويل (OCR)' : 'Transfer Proof Verification Engine'}
          </h3>
          <p className="text-xs text-white/50">
            {isAr
              ? 'يقوم النظام بقراءة الصورة، استخراج البيانات آلياً، ومقارنتها مع قيود السجل المالي لكشف التلاعب والتكرار.'
              : 'Scans proof images, extracts OCR metadata, and detects duplication or Photoshop manipulation.'}
          </p>
        </div>

        {/* Optional Expected Transaction ID */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-white/70 block">
            {isAr ? 'رقم المعاملة المستهدفة (اختياري للربط المباشر):' : 'Anchor Transaction ID (Optional):'}
          </label>
          <input
            type="text"
            value={proofExpectedTxId}
            onChange={(e) => setProofExpectedTxId(e.target.value)}
            placeholder="مثال: TXN-9902"
            className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#c5a059]/60"
          />
        </div>

        {/* Upload Box */}
        <div className="border-2 border-dashed border-white/10 hover:border-[#c5a059]/50 rounded-2xl p-6 text-center space-y-3 bg-white/[0.01] transition-colors">
          <Upload className="w-8 h-8 text-[#c5a059] mx-auto" />
          <div>
            <span className="text-xs font-semibold text-white block">
              {selectedProofFile ? selectedProofFile.name : (isAr ? 'اختر صورة الإيصال أو اسحبها هنا' : 'Drop receipt screenshot here or browse')}
            </span>
            <span className="text-[10px] text-white/40 block mt-1">
              PNG, JPG, WebP (Max 10 MB)
            </span>
          </div>
          <label className="inline-block px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white cursor-pointer transition-colors">
            <span>{isAr ? 'تصفح الملفات' : 'Browse File'}</span>
            <input type="file" accept="image/*" onChange={handleFileDropOrSelect} className="hidden" />
          </label>
        </div>

        {/* Action Verify Button */}
        <button
          onClick={handleRunProofVerification}
          disabled={!selectedProofFile || isVerifyingProof}
          className="w-full py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-lg transition-all cursor-pointer disabled:opacity-50"
        >
          {isVerifyingProof
            ? (isAr ? 'جاري فحص الـ OCR والبصمة المشفرة...' : 'Analyzing OCR & Ledger Hash...')
            : (isAr ? 'بدء الفحص والتحقق الآلي' : 'Run Proof Verification')}
        </button>

        {/* Verification Result Output */}
        {proofResult && (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{isAr ? 'نتيجة التحقق:' : 'Verification Verdict:'}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[11px] ${
                  proofResult.matchStatus === 'match'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : proofResult.matchStatus === 'suspicious'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {proofResult.matchStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-white/70 pt-1">
              <div>
                <span className="text-[10px] text-white/40 block">{isAr ? 'المبلغ المستخرج:' : 'Extracted Amount:'}</span>
                <span className="font-mono font-bold text-white">{proofResult.extractedAmount} Coins</span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 block">{isAr ? 'نسبة التطابق:' : 'Confidence Score:'}</span>
                <span className="font-mono font-bold text-[#c5a059]">{proofResult.confidence}%</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/5 text-[11px] text-white/70 leading-relaxed">
              {proofResult.notes}
            </div>

            {proofResult.flags.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-white/40 block">{isAr ? 'تنبيهات النظام:' : 'System Flags:'}</span>
                {proofResult.flags.map((flag: string, idx: number) => (
                  <span key={idx} className="block text-[10px] text-amber-400 font-mono">
                    • {flag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
