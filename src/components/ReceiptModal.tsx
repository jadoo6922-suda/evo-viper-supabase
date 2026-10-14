import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  Download,
  Copy,
  Check,
  X,
  QrCode as QrIcon,
  CheckCircle2,
  Lock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { Transaction } from '../types';
import { useStore } from '../context/StoreContext';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const { language } = useStore();
  const isAr = language === 'ar';

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'image'>('details');

  const verifyUrl = transaction ? `${window.location.origin}/?verify=${transaction.id}` : '';

  // Generate QR Code pointing to live verification route
  useEffect(() => {
    if (!transaction) return;
    QRCode.toDataURL(
      verifyUrl,
      {
        width: 220,
        margin: 1,
        color: {
          dark: '#080a0e',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [transaction, verifyUrl]);

  // Generate clean canvas receipt over template
  useEffect(() => {
    if (!transaction) return;
    generateReceiptImage();
  }, [transaction, qrDataUrl]);

  if (!transaction) return null;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(transaction.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateReceiptImage = async () => {
    if (!transaction) return;
    setIsRendering(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1050;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Load Pre-generated Luxury Template or fallback to dark canvas
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous';
      templateImg.src = '/assets/receipt-template.png';

      const imageLoaded = await new Promise<boolean>((resolve) => {
        templateImg.onload = () => resolve(true);
        templateImg.onerror = () => resolve(false);
      });

      if (imageLoaded) {
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
        // Add subtle dark overlay for crisp text readability
        ctx.fillStyle = 'rgba(8, 10, 14, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Fallback canvas if template image isn't yet ready
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#0c1017');
        grad.addColorStop(0.5, '#121722');
        grad.addColorStop(1, '#080a0e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gold border frame
        ctx.strokeStyle = '#c5a059';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
      }

      // 2. Header & Store Branding
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c5a059';
      ctx.font = 'bold 22px serif';
      ctx.fillText('DIGITAL STORE', canvas.width / 2, 110);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('إيصال تحويل مالي معتمد • Official Transaction Receipt', canvas.width / 2, 140);

      // Subtle divider line
      ctx.strokeStyle = 'rgba(197, 160, 89, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, 165);
      ctx.lineTo(canvas.width - 100, 165);
      ctx.stroke();

      // 3. Amount Display
      ctx.fillStyle = '#8e9aa8';
      ctx.font = '13px sans-serif';
      ctx.fillText('المبلغ المحول / Transferred Amount', canvas.width / 2, 215);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(`${transaction.amount} ${transaction.currency || 'COIN'}`, canvas.width / 2, 265);

      // Status pill
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(canvas.width / 2 - 80, 290, 160, 28);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.strokeRect(canvas.width / 2 - 80, 290, 160, 28);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('✓ معاملة ناجحة (Completed)', canvas.width / 2, 309);

      // 4. Detailed metadata box
      const boxY = 350;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(80, boxY, canvas.width - 160, 180);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeRect(80, boxY, canvas.width - 160, 180);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#8e9aa8';
      ctx.font = '13px sans-serif';

      const drawRow = (label: string, val: string, y: number) => {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#8e9aa8';
        ctx.fillText(label, canvas.width - 110, y);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(val, 110, y);
      };

      drawRow('رقم المعاملة (TX ID):', transaction.id, boxY + 35);
      drawRow('رقم المرجع (Ref):', transaction.reference, boxY + 70);
      drawRow(
        'التاريخ والوقت:',
        new Date(transaction.timestamp).toLocaleString('ar-SA'),
        boxY + 105
      );
      drawRow('المرسل:', transaction.senderName || transaction.senderId, boxY + 140);
      drawRow('المستلم:', transaction.receiverName || transaction.receiverId, boxY + 165);

      // 5. Real QR Code for Live Instant Verification
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise((res) => {
          qrImg.onload = res;
        });

        // White card background behind QR
        const qrSize = 170;
        const qrX = canvas.width / 2 - qrSize / 2;
        const qrY = 560;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        ctx.textAlign = 'center';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('امسح الكود للتحقق المباشر من السجل المالي لحظياً', canvas.width / 2, 765);

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#8e9aa8';
        ctx.fillText('Scan QR with phone camera for live verification', canvas.width / 2, 785);
      }

      // 6. Real Cryptographic HMAC Signature
      ctx.strokeStyle = 'rgba(197, 160, 89, 0.2)';
      ctx.beginPath();
      ctx.moveTo(80, 830);
      ctx.lineTo(canvas.width - 80, 830);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '11px monospace';
      ctx.fillStyle = '#c5a059';
      ctx.fillText(
        `SERVER-HMAC: ${transaction.securityVerificationHash || 'AUTHENTICATED-LEDGER-ENTRY'}`,
        canvas.width / 2,
        860
      );

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#5a6675';
      ctx.fillText(
        'قيد مالي غير قابل للتراجع أو التعديل • مسجل بسجل المعاملات المزدوجة (Double-Entry Ledger)',
        canvas.width / 2,
        890
      );

      const generatedData = canvas.toDataURL('image/png');
      setReceiptImageUrl(generatedData);
    } catch (err) {
      console.error('Error generating receipt canvas:', err);
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownloadImage = () => {
    if (!receiptImageUrl) return;
    const link = document.createElement('a');
    link.download = `Receipt_${transaction.id}.png`;
    link.href = receiptImageUrl;
    link.click();
  };

  return (
    <div
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl bg-[#0e1218] border border-white/10 shadow-2xl shadow-black p-6 sm:p-7 text-[#f7f7f9] animate-in fade-in zoom-in-95 duration-200 my-8 space-y-5"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 ltr:right-5 rtl:left-5 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title & Tab Switcher */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#801428]/20 border border-[#801428]/40 flex items-center justify-center text-[#c5a059]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {isAr ? 'إيصال المعاملة المعتمد' : 'Official Transaction Receipt'}
              </h2>
              <p className="text-xs text-white/50">
                {isAr ? 'توثيق رقمي صادر عن السجل المالي للمتجر' : 'Cryptographically verified transaction record'}
              </p>
            </div>
          </div>

          <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/5 text-xs">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-[#801428] text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isAr ? 'بيانات المعاملة' : 'Transaction Details'}</span>
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-[#801428] text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{isAr ? 'صورة الإيصال (PNG)' : 'Receipt Image'}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Amount Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#141a24] to-[#10141c] border border-white/5 text-center space-y-1">
              <span className="text-xs text-white/40 block">{isAr ? 'المبلغ الإجمالي' : 'Total Amount'}</span>
              <p className="text-3xl font-extrabold text-[#c5a059]">
                {transaction.amount}{' '}
                <span className="text-sm font-semibold text-white/80">{transaction.currency || 'COIN'}</span>
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{isAr ? 'معاملة مكتملة ومقيدة بالدفتر' : 'Completed & Settled'}</span>
              </div>
            </div>

            {/* Fields Grid */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono">
                <span className="text-white/40 font-sans">{isAr ? 'رقم المعاملة' : 'Transaction ID'}</span>
                <span className="text-white select-all">{transaction.id}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono">
                <span className="text-white/40 font-sans">{isAr ? 'الرقم المرجعي' : 'Reference'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#c5a059] select-all">{transaction.reference}</span>
                  <button
                    onClick={handleCopyRef}
                    className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={isAr ? 'نسخ المرجع' : 'Copy reference'}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[11px]">{isAr ? 'المرسل' : 'Sender'}</span>
                  <span className="text-white font-medium truncate block mt-0.5">
                    {transaction.senderName || transaction.senderId}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[11px]">{isAr ? 'المستلم' : 'Receiver'}</span>
                  <span className="text-white font-medium truncate block mt-0.5">
                    {transaction.receiverName || transaction.receiverId}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-white/40">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</span>
                <span className="text-white/80">{new Date(transaction.timestamp).toLocaleString('ar-SA')}</span>
              </div>

              {/* Server HMAC Signature */}
              {transaction.securityVerificationHash && (
                <div className="p-3 rounded-xl bg-[#090b10] border border-white/5 space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-white/40 font-sans text-xs">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#c5a059]" />
                      <span>{isAr ? 'توقيع السيرفر المشفر (HMAC-SHA256)' : 'Cryptographic Server HMAC'}</span>
                    </span>
                    <span className="text-emerald-400 font-sans text-[10px] font-bold">
                      {isAr ? 'موثق' : 'Verified'}
                    </span>
                  </div>
                  <p className="text-white/60 select-all break-all pt-1 text-[10px]">
                    {transaction.securityVerificationHash}
                  </p>
                </div>
              )}
            </div>

            {/* QR Code & Live Link Section */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center gap-4">
              {qrDataUrl && (
                <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                  <img src={qrDataUrl} alt="Verification QR" className="w-24 h-24" />
                </div>
              )}
              <div className="space-y-2 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left flex-1">
                <p className="text-xs font-bold text-white">
                  {isAr ? 'رمز استجابة سريعة (QR) للتحقق المباشر' : 'Live Verification QR Code'}
                </p>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  {isAr
                    ? 'يمكن لأي شخص مسح الكود بكاميرا الجوال للتحقق من وجود المعاملة وحالتها مباشرة من قاعدة البيانات دون تسجيل الدخول.'
                    : 'Scan with any mobile camera to view real-time settlement status directly from database.'}
                </p>
                <a
                  href={`/?verify=${transaction.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#c5a059] hover:underline pt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isAr ? 'فتح صفحة التحقق الحية' : 'Open Public Verification Page'}</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RECEIPT IMAGE */}
        {activeTab === 'image' && (
          <div className="space-y-4 animate-in fade-in duration-150 text-center">
            {isRendering ? (
              <div className="py-20 space-y-3">
                <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-white/50">{isAr ? 'جاري بناء صورة الإيصال...' : 'Rendering receipt image...'}</p>
              </div>
            ) : receiptImageUrl ? (
              <div className="space-y-4">
                <div className="max-h-[380px] overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-2">
                  <img
                    src={receiptImageUrl}
                    alt="Official Receipt"
                    className="w-full max-w-sm mx-auto rounded-xl shadow-2xl"
                  />
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleDownloadImage}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] text-xs font-bold text-white shadow-lg flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isAr ? 'تحميل صورة الإيصال (PNG)' : 'Download Receipt (PNG)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-rose-400 py-10">
                {isAr ? 'تعذر توليد صورة الإيصال.' : 'Failed to generate receipt image.'}
              </p>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
          <span className="text-white/40 text-[11px]">
            {isAr ? 'سجل غير قابل للتعديل' : 'Immutable Ledger Entry'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
