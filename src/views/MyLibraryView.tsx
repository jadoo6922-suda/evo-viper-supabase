import React, { useState } from 'react';
import {
  FolderLock,
  Download,
  ExternalLink,
  ShieldCheck,
  Clock,
  HardDrive,
  FileCode2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  Lock,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order } from '../types';

export const MyLibraryView: React.FC = () => {
  const {
    orders,
    currentUser,
    downloadProductFile,
    confirmEscrowDelivery,
    disputeEscrowOrder,
    language,
    products,
  } = useStore();
  const isAr = language === 'ar';

  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  // Escrow actions state
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [disputeModalOrder, setDisputeModalOrder] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const userLibraryOrders = orders.filter(
    (o) =>
      currentUser &&
      o.userId === currentUser.id &&
      (o.status === 'paid' ||
        o.status === 'delivered' ||
        o.status === 'completed' ||
        o.status === 'escrow_held' ||
        o.status === 'escrow_disputed')
  );

  const handleDownload = (orderId: string) => {
    setDownloadingOrderId(orderId);
    setTimeout(async () => {
      const res = await downloadProductFile(orderId);
      if (res.success && res.downloadUrl) {
        setDownloadMessage(res.message || (isAr ? 'تم إنشاء رابط التنزيل المشفر بنجاح.' : 'Generated signed URL.'));
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = res.fileName || `product_${orderId}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
          setDownloadingOrderId(null);
        }, 1200);
      } else {
        setDownloadMessage(res.message || (isAr ? 'خطأ في إنشاء رابط التنزيل.' : 'Error generating download.'));
        setDownloadingOrderId(null);
      }
    }, 800);
  };

  const handleConfirmDelivery = async (orderId: string) => {
    setConfirmingOrderId(orderId);
    try {
      const res = await confirmEscrowDelivery(orderId);
      if (res.success) {
        setActionSuccessMsg(
          isAr
            ? 'تم تأكيد الاستلام بنجاح ("أرسل خالص")، وأُفرج عن المبلغ لصالح التاجر.'
            : 'Delivery confirmed! Escrow funds have been successfully released to the merchant.'
        );
        setTimeout(() => setActionSuccessMsg(null), 5000);
      } else {
        setDownloadMessage(res.message || (isAr ? 'فشل تأكيد الاستلام' : 'Failed to confirm delivery'));
      }
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleOpenDispute = (order: Order) => {
    setDisputeModalOrder(order);
    setDisputeReason('');
    setDisputeError(null);
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModalOrder) return;
    if (disputeReason.trim().length < 10) {
      setDisputeError(
        isAr
          ? 'يرجى كتابة سبب النزاع بالتفصيل (10 أحرف على الأقل).'
          : 'Please provide dispute details (at least 10 characters).'
      );
      return;
    }

    setDisputeLoading(true);
    setDisputeError(null);
    try {
      const res = await disputeEscrowOrder(disputeModalOrder.id, disputeReason.trim());
      if (res.success) {
        setActionSuccessMsg(
          isAr
            ? `تم فتح النزاع بنجاح برقم ${res.disputeId || ''} وتم تجميد الإطلاق التلقائي للمبلغ.`
            : `Dispute opened (${res.disputeId || ''})! Auto-release timer has been frozen.`
        );
        setDisputeModalOrder(null);
        setTimeout(() => setActionSuccessMsg(null), 5000);
      } else {
        setDisputeError(res.message || (isAr ? 'فشل رفع النزاع' : 'Failed to open dispute'));
      }
    } finally {
      setDisputeLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16" id="my-library-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderLock className="w-6 h-6 text-[#c5a059]" />
            <span>{isAr ? 'مكتبتي الرقمية' : 'My Digital Library'}</span>
          </h1>
          <p className="text-xs text-white/50">
            {isAr
              ? 'المنتجات الرقمية التي قمت بشرائها مع روابط تحميل آمنة ومشفرة، وإدارة ضمان Escrow وتأكيد الاستلام'
              : 'Purchased digital assets with tamper-resistant signed URLs and Escrow protection controls'}
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#c5a059]">
          {userLibraryOrders.length} {isAr ? 'منتجات مملوكة' : 'Owned Assets'}
        </span>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-white/40 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Download Alert */}
      {downloadMessage && (
        <div className="p-3.5 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#f5d799] text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#c5a059]" />
            <span>{downloadMessage}</span>
          </div>
          <button
            onClick={() => setDownloadMessage(null)}
            className="text-white/40 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Empty State */}
      {userLibraryOrders.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#12161d] border border-white/10 text-center space-y-3">
          <FolderLock className="w-12 h-12 text-white/20 mx-auto" />
          <h3 className="text-sm font-bold text-white">
            {isAr ? 'مكتبتك الرقمية فارغة حتى الآن' : 'Your digital library is currently empty'}
          </h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {isAr
              ? 'عند قيامك بشراء أي منتج، سيتم فك التشفير تلقائياً وتسليم الملفات فوراً في هذه الصفحة.'
              : 'Once you purchase a product, encrypted delivery tokens are minted and placed in your vault.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userLibraryOrders.map((order) => {
            const product = products.find((p) => p.id === order.productId);
            const isDownloading = downloadingOrderId === order.id;
            const isConfirming = confirmingOrderId === order.id;
            const isEscrowHeld = order.status === 'escrow_held';
            const isEscrowDisputed = order.status === 'escrow_disputed';
            const isCompleted = order.status === 'completed' || order.status === 'delivered';

            return (
              <div
                key={order.id}
                className={`rounded-2xl bg-[#12161d] border p-5 space-y-4 transition-all ${
                  isEscrowDisputed
                    ? 'border-rose-500/40'
                    : isEscrowHeld
                    ? 'border-amber-500/40 hover:border-amber-500/70'
                    : 'border-white/10 hover:border-[#c5a059]/40'
                }`}
              >
                {/* Header Info */}
                <div className="flex items-start gap-4">
                  <img
                    src={order.productThumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                    alt={order.productName}
                    className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0 bg-[#151a22]"
                  />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-[#c5a059]">#{order.id}</span>
                      {isEscrowHeld && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>{isAr ? 'محجوز بضمان Escrow' : 'Escrow Protected'}</span>
                        </span>
                      )}
                      {isEscrowDisputed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{isAr ? 'نزاع قيد التحقيق' : 'Disputed'}</span>
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isAr ? 'مكتمل ومسلّم' : 'Completed'}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-white line-clamp-1">{order.productName}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-white/50">
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="font-mono text-white/80">{order.price} Coins</span>
                    </div>
                  </div>
                </div>

                {/* Escrow Banner & Action Section */}
                {isEscrowHeld && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-amber-300">
                      <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div className="space-y-0.5">
                        <span className="font-bold block">
                          {isAr ? 'المبلغ محجوز بأمان في نظام الضمان (Escrow)' : 'Funds Held Safely in Escrow'}
                        </span>
                        <p className="text-[11px] text-amber-200/70 leading-relaxed">
                          {isAr
                            ? 'المبلغ قيد الحفظ لحمايتك. بعد فحص الملفات والتأكد من سلامتها، اضغط "أرسل خالص" للإفراج عن الرصيد للتاجر فوراً.'
                            : 'Protected by Escrow. Once you inspect the files, click "Confirm Delivery" to release funds to the merchant.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleConfirmDelivery(order.id)}
                        disabled={isConfirming}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 transition-all cursor-pointer shadow disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isConfirming
                            ? (isAr ? 'جاري الإفراج...' : 'Releasing...')
                            : (isAr ? 'أرسل خالص (تأكيد الاستلام)' : 'Confirm Delivery')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDispute(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{isAr ? 'رفع نزاع' : 'Open Dispute'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Disputed Status Notice */}
                {isEscrowDisputed && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{isAr ? 'الطلب متنازع عليه — تم تجميد الإطلاق التلقائي' : 'Dispute Active — Auto-Release Frozen'}</span>
                    </div>
                    <p className="text-[11px] text-rose-200/70">
                      {isAr
                        ? 'فريق الإدارة يقوم حالياً بالتحقيق في تفاصيل النزاع وفحص الأدلة. الرصيد محجوز في حساب الضمان حتى الفصل النهائي.'
                        : 'The administration is currently arbitrating this case. Escrow funds remain frozen until final resolution.'}
                    </p>
                  </div>
                )}

                {/* Specs */}
                {product && (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
                    <div>
                      <span className="text-white/40 block">{isAr ? 'الإصدار' : 'Version'}</span>
                      <span className="font-medium text-white">{product.version || '1.0'}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block">{isAr ? 'الحجم' : 'Size'}</span>
                      <span className="font-medium text-white">{product.fileSize || '25 MB'}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block">{isAr ? 'التحميلات' : 'Downloads'}</span>
                      <span className="font-mono text-[#c5a059]">{order.downloadsCount || 0} / {order.maxDownloads || 10}</span>
                    </div>
                  </div>
                )}

                {/* Download Action */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isAr ? 'رابط مشفر Signed URL' : 'Protected Token Delivery'}</span>
                  </div>

                  <button
                    onClick={() => handleDownload(order.id)}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span>
                      {isDownloading
                        ? (isAr ? 'جاري التحقق وتوليد الرابط...' : 'Signing URL...')
                        : (isAr ? 'تحميل الملفات' : 'Download Files')}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Escrow Dispute Modal */}
      {disputeModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161d] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">
                  {isAr ? 'رفع نزاع وتجميد إطلاق المبلغ' : 'Open Dispute & Freeze Escrow'}
                </h3>
              </div>
              <button
                onClick={() => setDisputeModalOrder(null)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-white/70 space-y-1">
              <p>
                {isAr
                  ? `أنت على وشك فتح نزاع للطلب #${disputeModalOrder.id} بقيمة ${disputeModalOrder.price} Coins.`
                  : `Disputing order #${disputeModalOrder.id} for ${disputeModalOrder.price} Coins.`}
              </p>
              <p className="text-rose-300">
                {isAr
                  ? 'سيؤدي هذا إلى تجميد مهلة الإطلاق التلقائي فوراً ووضع المنتج قيد التحقيق لدى الإدارة.'
                  : 'This will freeze the auto-release timer and place the product under administrative review.'}
              </p>
            </div>

            <form onSubmit={handleSubmitDispute} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80 block">
                  {isAr ? 'سبب وتفاصيل النزاع:' : 'Dispute Reason & Details:'}
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder={
                    isAr
                      ? 'وضح المشكلة بالتفصيل (مثل: الملف تالف، مختلف تماماً عن الوصف، كود التفعيل غير صالح...)'
                      : 'Describe the issue clearly (e.g. corrupted file, wrong specification, invalid key...)'
                  }
                  rows={4}
                  className="w-full bg-[#151a22] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              {disputeError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {disputeError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={disputeLoading || disputeReason.trim().length < 10}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-400/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  {disputeLoading
                    ? (isAr ? 'جاري رفع النزاع وتجميد المبلغ...' : 'Submitting Dispute...')
                    : (isAr ? 'تأكيد رفع النزاع' : 'Submit Dispute')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
