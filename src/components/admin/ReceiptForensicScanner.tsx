import React, { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSearch,
  ScanLine,
  Search,
  ArrowRight,
  Database,
  Eye,
  RefreshCw,
  FileText,
  Sparkles,
  Info,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { verifyReceiptWithGemini, OcrVerificationResponse } from '../../lib/serverSecurity';

export const ReceiptForensicScanner: React.FC = () => {
  const { language, transactions } = useStore();
  const isAr = language === 'ar';

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [expectedTxId, setExpectedTxId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrVerificationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setOcrResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setImageSrc(b64);
      runOcrAnalysis(b64, expectedTxId);
    };
    reader.readAsDataURL(file);
  };

  const runOcrAnalysis = async (src: string, targetTxId?: string) => {
    setIsScanning(true);
    setErrorMsg(null);

    try {
      const response = await verifyReceiptWithGemini(src, targetTxId || undefined);
      setOcrResult(response);
    } catch (err: any) {
      console.error('OCR scanning error:', err);
      setErrorMsg(err?.message || 'فشل في استدعاء خدمة الفحص البصري عبر Gemini.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualRecheck = () => {
    if (imageSrc) {
      runOcrAnalysis(imageSrc, expectedTxId);
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setOcrResult(null);
    setErrorMsg(null);
    setExpectedTxId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#10141c] to-[#141a24] border border-white/10 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#c5a059]">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">
              {isAr ? 'فحص الإيصالات البصري الذكي (Gemini Vision OCR)' : 'Intelligent Receipt OCR (Gemini Vision)'}
            </h2>
            <p className="text-xs text-white/50">
              {isAr
                ? 'استخراج بصري حقيقي للأرقام والتواريخ والمبالغ ومطابقتها اللحظية مع السجل المحاسبي الرسمي لـ Supabase'
                : 'Genuine OCR extracting text, amounts & references, cross-verified against official Supabase ledger'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Parameters */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-[#0e1218] border border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
              {isAr ? '1. رفع صورة الإيصال' : '1. Upload Receipt Image'}
            </h3>

            {/* Optional Expected Transaction ID */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/60 block">
                {isAr ? 'رقم المعاملة المتوقع (اختياري للربط المباشر)' : 'Expected Transaction ID (Optional)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={expectedTxId}
                  onChange={(e) => setExpectedTxId(e.target.value)}
                  placeholder="TXN-123456"
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a059]"
                />
                {imageSrc && (
                  <button
                    onClick={handleManualRecheck}
                    disabled={isScanning}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-medium cursor-pointer transition-colors"
                  >
                    {isAr ? 'إعادة الفحص' : 'Recheck'}
                  </button>
                )}
              </div>
            </div>

            {/* Quick picker from recent transactions */}
            {transactions.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] text-white/40 block">
                  {isAr ? 'أو اختر من المعاملات الأخيرة بالمتجر:' : 'Or pick from recent transactions:'}
                </span>
                <select
                  value={expectedTxId}
                  onChange={(e) => setExpectedTxId(e.target.value)}
                  className="w-full bg-[#121620] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-[#c5a059]"
                >
                  <option value="">{isAr ? '-- بدون تحديد مسبق (البحث التلقائي) --' : '-- Auto detect --'}</option>
                  {transactions.slice(0, 8).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} - {t.amount} COIN ({t.reference})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-[#c5a059]/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03] group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-[#801428]/20 border border-white/10 group-hover:border-[#c5a059]/40 flex items-center justify-center mx-auto text-white/60 group-hover:text-[#c5a059] transition-all">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-white mt-3">
                {isAr ? 'اضغط لرفع صورة إيصال أو اسحبها هنا' : 'Click or drop receipt image'}
              </p>
              <p className="text-[11px] text-white/40 mt-1">
                {isAr
                  ? 'يدعم صور JPG, PNG من أي بنك أو محفظة أو إيصالات المتجر'
                  : 'Supports JPG, PNG from any bank, wallet, or store receipt'}
              </p>
            </div>

            {/* Image Preview if uploaded */}
            {imageSrc && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/60">
                    {isAr ? 'الصورة المحملة' : 'Uploaded Image'}
                  </span>
                  <button
                    onClick={handleReset}
                    className="text-xs text-rose-400 hover:underline cursor-pointer"
                  >
                    {isAr ? 'إزالة' : 'Remove'}
                  </button>
                </div>
                <div className="max-h-64 overflow-hidden rounded-xl border border-white/10 bg-black/40 flex items-center justify-center p-2">
                  <img src={imageSrc} alt="Uploaded Receipt" className="max-h-60 w-auto rounded-lg object-contain" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: OCR Results & Ledger Match */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-[#0e1218] border border-white/10 space-y-5 min-h-[420px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-[#c5a059]" />
              <span>{isAr ? '2. نتائج الفحص البصري والمطابقة المالية' : '2. Optical Analysis & Ledger Match'}</span>
            </h3>

            {/* Scanning State */}
            {isScanning && (
              <div className="py-24 text-center space-y-4">
                <div className="w-12 h-12 border-3 border-[#c5a059] border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {isAr ? 'جاري تحليل الصورة عبر نموذج Gemini Vision...' : 'Analyzing receipt image via Gemini Vision...'}
                  </p>
                  <p className="text-xs text-white/50">
                    {isAr
                      ? 'استخراج النصوص والأرقام ومقارنتها بالسجل المحاسبي الحقيقي'
                      : 'Extracting data and cross-checking against official Supabase ledger'}
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {!isScanning && errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Empty State */}
            {!isScanning && !ocrResult && !errorMsg && (
              <div className="py-24 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-white/30">
                  <Eye className="w-6 h-6" />
                </div>
                <p className="text-xs text-white/40 max-w-xs mx-auto">
                  {isAr
                    ? 'ارفع صورة إيصال للبدء في الفحص البصري الفعلي ومقارنة البيانات بقاعدة البيانات'
                    : 'Upload a receipt image to perform genuine OCR and ledger verification'}
                </p>
              </div>
            )}

            {/* Completed OCR Results */}
            {!isScanning && ocrResult && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Match Banner */}
                {ocrResult.matchStatus === 'match' && (
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-3.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                        AUTHENTIC & VERIFIED MATCH (100% مطابقة مؤكدة)
                      </span>
                      <p className="text-sm font-bold text-white">{ocrResult.notes}</p>
                      <p className="text-[11px] text-white/60">
                        {isAr
                          ? 'تطابق كامل بين المبلغ ورقم المرجع المستخرج من الصورة مع السجل المالي الرسمي.'
                          : 'Amount and reference extracted from image match official ledger records.'}
                      </p>
                    </div>
                  </div>
                )}

                {ocrResult.matchStatus === 'partial_match' && (
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3.5">
                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block">
                        PARTIAL MATCH (مطابقة جزئية)
                      </span>
                      <p className="text-sm font-bold text-white">{ocrResult.notes}</p>
                      <p className="text-[11px] text-white/60">
                        {isAr
                          ? 'المبلغ المالي متطابق، لكن هناك اختلافات في رقم المرجع أو التوقيع.'
                          : 'Amount matches, but differences were found in reference or party details.'}
                      </p>
                    </div>
                  </div>
                )}

                {ocrResult.matchStatus === 'mismatch' && (
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-3.5">
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 block">
                        DATA MISMATCH (عدم تطابق بالبيانات)
                      </span>
                      <p className="text-sm font-bold text-white">{ocrResult.notes}</p>
                      <p className="text-[11px] text-white/60">
                        {isAr
                          ? 'تنبيه أمني: البيانات الموجودة على الصورة تختلف جوهرياً عن المعاملة المسجلة بالنظام.'
                          : 'Security Alert: Image details contradict registered database transaction.'}
                      </p>
                    </div>
                  </div>
                )}

                {ocrResult.matchStatus === 'not_found' && (
                  <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/40 flex items-start gap-3.5">
                    <Info className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 block">
                        RECEIPT EXTRACTED • NOT IN STORE LEDGER
                      </span>
                      <p className="text-sm font-bold text-white">{ocrResult.notes}</p>
                      <p className="text-[11px] text-white/60">
                        {isAr
                          ? 'نجح الذكاء الاصطناعي في قراءة الإيصال، ولكن المعاملة غير مسجلة في هذا المتجر (قد تكون من بنك خارجي).'
                          : 'Gemini successfully read the receipt, but the reference does not belong to this store node.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Extracted Data Box */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white/70 flex items-center justify-between">
                    <span>{isAr ? 'البيانات المستخرجة بالرؤية البصرية (Gemini Vision)' : 'Extracted Optical Data'}</span>
                    <span className="text-[11px] font-mono text-[#c5a059]">
                      دقة الفحص: {ocrResult.confidence}%
                    </span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-white/40 block text-[11px]">{isAr ? 'المبلغ المستخرج' : 'Extracted Amount'}</span>
                      <span className="font-bold text-sm text-[#c5a059] block mt-0.5">
                        {ocrResult.extracted?.amount != null ? `${ocrResult.extracted.amount} ${ocrResult.extracted.currency || ''}` : 'غير واضح'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 font-mono">
                      <span className="text-white/40 font-sans block text-[11px]">{isAr ? 'رقم المرجع' : 'Reference'}</span>
                      <span className="text-white font-medium truncate block mt-0.5 select-all">
                        {ocrResult.extracted?.reference || 'غير متوفر'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-white/40 block text-[11px]">{isAr ? 'التاريخ المقروء' : 'Extracted Date'}</span>
                      <span className="text-white font-medium block mt-0.5">
                        {ocrResult.extracted?.date || 'غير محدد'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-white/40 block text-[11px]">{isAr ? 'المرسل' : 'Sender'}</span>
                      <span className="text-white/90 truncate block mt-0.5">
                        {ocrResult.extracted?.senderName || 'غير مسجل'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-white/40 block text-[11px]">{isAr ? 'المستلم' : 'Receiver'}</span>
                      <span className="text-white/90 truncate block mt-0.5">
                        {ocrResult.extracted?.receiverName || 'غير مسجل'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-white/40 block text-[11px]">{isAr ? 'البنك / التطبيق' : 'Bank / App'}</span>
                      <span className="text-white/90 truncate block mt-0.5">
                        {ocrResult.extracted?.bankOrApp || 'غير محدد'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Supabase Database Record Comparison */}
                {ocrResult.transaction && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <h4 className="text-xs font-bold text-white/70 flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-[#c5a059]" />
                      <span>{isAr ? 'الالمعاملة المطابقة في قاعدة البيانات الرسمية (Supabase)' : 'Matched Supabase Ledger Record'}</span>
                    </h4>

                    <div className="p-3.5 rounded-2xl bg-[#090c10] border border-white/5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white/50">{isAr ? 'المعرف المحاسبي' : 'Transaction ID'}</span>
                        <span className="font-mono text-white select-all">{ocrResult.transaction.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/50">{isAr ? 'المبلغ الفعلي بالسجل' : 'Official Amount'}</span>
                        <span className="font-bold text-[#c5a059]">{ocrResult.transaction.amount} COIN</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/50">{isAr ? 'توقيع السيرفر المشفر' : 'Server HMAC'}</span>
                        <span className="font-mono text-[10px] text-white/60 truncate max-w-xs">
                          {ocrResult.transaction.securityVerificationHash || 'سليم'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
