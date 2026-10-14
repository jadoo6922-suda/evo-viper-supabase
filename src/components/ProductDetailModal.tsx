import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  HardDrive,
  GitBranch,
  Layers,
  Coins,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Star,
} from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { supabase } from '../lib/supabase';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onNavigateToWallet: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onNavigateToWallet,
}) => {
  const { language, currentUser, getUserBalance, purchaseProduct, orders } = useStore();
  const isAr = language === 'ar';

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<{
    loading: boolean;
    error?: string;
    success?: string;
  }>({ loading: false });
  const [reviews, setReviews] = useState<Array<{ id: string; reviewer_id: string; rating: number; comment?: string | null; created_at: string }>>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');

  useEffect(() => {
    if (!product) return;
    let active = true;
    fetch(`/api/products/${encodeURIComponent(product.id)}/reviews`)
      .then(async response => response.ok ? response.json() : { reviews: [] })
      .then(result => { if (active && Array.isArray(result.reviews)) setReviews(result.reviews); })
      .catch(() => { if (active) setReviews([]); });
    return () => { active = false; };
  }, [product?.id]);

  if (!product) return null;

  const currentBalance = currentUser ? getUserBalance(currentUser.id) : 0;
  const balanceAfter = currentBalance - product.price;
  const hasInsufficientBalance = currentBalance < product.price;
  const isAlreadyOwned = orders.some(
    (o) => currentUser && o.userId === currentUser.id && o.productId === product.id && o.status === 'paid'
  );

  const handleConfirmPurchase = async () => {
    setPurchaseStatus({ loading: true });
    setTimeout(async () => {
      const res = await purchaseProduct(product.id);
      if (res.success) {
        setPurchaseStatus({ loading: false, success: res.message });
        setTimeout(() => {
          setShowConfirmModal(false);
          onClose();
        }, 1800);
      } else {
        setPurchaseStatus({ loading: false, error: res.message });
      }
    }, 600);
  };

  return (
    <>
      {/* Main Product Details Dialog */}
      <div
        id="product-detail-backdrop"
        className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0f1318] border border-white/10 shadow-2xl overflow-hidden text-[#f7f7f9] animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-6 md:p-8 space-y-6">
            {/* Image Preview & Hero Details */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video bg-[#141820]">
              <img
                src={product.thumbnail}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1318] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div className="space-y-1">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#801428] text-white border border-[#c5a059]/40">
                    {product.category}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                    {isAr ? product.name : product.nameEn}
                  </h2>
                </div>
                <div className="text-right bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-[#c5a059]/30">
                  <span className="text-xs text-white/50 block">{isAr ? 'السعر' : 'Price'}</span>
                  <span className="text-2xl font-black text-white">{product.price}</span>{' '}
                  <span className="text-xs font-semibold text-[#c5a059]">COINS</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#c5a059] uppercase tracking-wider">
                {isAr ? 'الوصف الشامل' : 'Full Description'}
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                {isAr ? product.description : product.descriptionEn}
              </p>
            </div>

            {/* Technical Specifications Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-white/40">
                  <FileCode2 className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>{isAr ? 'نوع الملف' : 'File Type'}</span>
                </div>
                <span className="font-medium text-white block">{product.fileType}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-white/40">
                  <HardDrive className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>{isAr ? 'حجم الملف' : 'File Size'}</span>
                </div>
                <span className="font-medium text-white block">{product.fileSize}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-white/40">
                  <GitBranch className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>{isAr ? 'الإصدار' : 'Version'}</span>
                </div>
                <span className="font-medium text-white block">{product.version}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>{isAr ? 'التوافق' : 'Compatibility'}</span>
                </div>
                <span className="font-medium text-white truncate block">{product.compatibility}</span>
              </div>
            </div>

            {/* Key Features list */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#c5a059] uppercase tracking-wider">
                {isAr ? 'المميزات الرئيسية المشمولة' : 'Key Features Included'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(isAr ? product.features : product.featuresEn).map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-white/80"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified-purchase reviews */}
            <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[#c5a059]">{isAr ? 'تقييمات المشترين' : 'Buyer reviews'}</h3><span className="text-xs text-white/45">{reviews.length} {isAr ? 'تقييم' : 'reviews'}</span></div>
              {currentUser && isAlreadyOwned && <div className="space-y-3 rounded-xl border border-[#c5a059]/15 bg-black/20 p-3">
                <p className="text-xs font-semibold text-white/75">{isAr ? 'قيّم تجربتك مع المنتج' : 'Rate your experience'}</p>
                <div className="flex items-center gap-1" role="group" aria-label={isAr ? 'اختيار التقييم' : 'Choose rating'}>{[1,2,3,4,5].map(value=><button key={value} type="button" onClick={()=>setReviewRating(value)} aria-label={`${value} stars`} className="p-1"><Star className={`h-5 w-5 ${value<=reviewRating?'fill-[#c5a059] text-[#c5a059]':'text-white/25'}`}/></button>)}</div>
                <textarea value={reviewComment} onChange={e=>setReviewComment(e.target.value)} maxLength={2000} rows={2} placeholder={isAr?'اكتب رأيك (اختياري)...':'Write a comment (optional)...'} className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white" />
                <button type="button" disabled={reviewBusy} onClick={async()=>{ if(!supabase||!product)return; setReviewBusy(true);setReviewNotice('');try{const {data}=await supabase.auth.getSession();const response=await fetch(`/api/products/${encodeURIComponent(product.id)}/reviews`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token||''}`},body:JSON.stringify({rating:reviewRating,comment:reviewComment})});const result=await response.json().catch(()=>({}));if(!response.ok||!result.success)throw new Error(result.message||'Review failed');setReviewNotice(isAr?'تم حفظ تقييمك.':'Your review was saved.');const refreshed=await fetch(`/api/products/${encodeURIComponent(product.id)}/reviews`).then(r=>r.json());setReviews(refreshed.reviews||[]);}catch(error:any){setReviewNotice(error?.message|| (isAr?'تعذر حفظ التقييم.':'Could not save review.'));}finally{setReviewBusy(false);}}} className="rounded-lg bg-[#801428] px-4 py-2 text-xs font-bold disabled:opacity-50">{reviewBusy?(isAr?'جارٍ الحفظ...':'Saving...'):(isAr?'حفظ التقييم':'Submit review')}</button>
                {reviewNotice&&<p className="text-xs text-white/60">{reviewNotice}</p>}
              </div>}
              {reviews.length===0?<p className="text-xs text-white/40">{isAr?'لا توجد تقييمات منشورة بعد. يمكن للمشترين تقييم المنتج بعد الشراء.':'No published reviews yet. Verified buyers can review after purchase.'}</p>:<div className="space-y-2">{reviews.slice(0,20).map(review=><article key={review.id} className="rounded-xl border border-white/5 bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1">{[1,2,3,4,5].map(n=><Star key={n} className={`h-3.5 w-3.5 ${n<=review.rating?'fill-[#c5a059] text-[#c5a059]':'text-white/20'}`}/>)}</div><span className="text-[10px] text-white/35">{new Date(review.created_at).toLocaleDateString()}</span></div>{review.comment&&<p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/70">{review.comment}</p>}<p className="mt-1 text-[10px] text-white/30">{isAr?'مشتري موثّق':'Verified purchaser'} · {String(review.reviewer_id).slice(0,6)}…</p></article>)}</div>}
            </section>

            {/* License & Terms note */}
            {product.terms && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50">
                <span className="font-semibold text-white/70 block mb-0.5">
                  {isAr ? 'شروط الاستخدام والترخيص:' : 'License & Terms:'}
                </span>
                {product.terms}
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="p-4 sm:p-6 bg-[#12161d] border-t border-white/10 flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-white/50 block">
                {isAr ? 'رصيدك المتاح حالياً' : 'Your Available Balance'}
              </span>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#c5a059]" />
                <span className="font-bold text-white">{currentBalance} Coins</span>
              </div>
            </div>

            {isAlreadyOwned ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'أنت تمتلك هذا المنتج بالفعل' : 'Product Already in Your Library'}</span>
              </div>
            ) : hasInsufficientBalance ? (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToWallet();
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-all cursor-pointer shadow-lg shadow-amber-900/30"
              >
                <Coins className="w-4 h-4" />
                <span>{isAr ? 'رصيدك غير كافٍ • شحن المحفظة' : 'Insufficient Coins • Top Up'}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-lg shadow-[#801428]/30 hover:shadow-[#801428]/50 transition-all cursor-pointer"
              >
                <span>{isAr ? 'شراء الآن وتسليم فوري' : 'Buy Now (Instant Delivery)'}</span>
                {isAr ? <ArrowLeft className="w-4 h-4 text-[#c5a059]" /> : <ArrowRight className="w-4 h-4 text-[#c5a059]" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          id="confirm-purchase-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0f1318] border border-[#801428]/60 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 text-[#f7f7f9]">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-xl mx-auto bg-[#801428]/30 border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">
                {isAr ? 'هل أنت متأكد من شراء هذا المنتج؟' : 'Confirm Product Purchase'}
              </h4>
              <p className="text-xs text-white/50">
                {isAr ? product.name : product.nameEn}
              </p>
            </div>

            {/* Price & Balance calculation breakdown */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-white/60">
                <span>{isAr ? 'سعر المنتج:' : 'Product Price:'}</span>
                <span className="font-bold text-white">{product.price} Coins</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>{isAr ? 'رصيدك الحالي:' : 'Current Balance:'}</span>
                <span className="font-bold text-[#c5a059]">{currentBalance} Coins</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                <span className="text-white/80">{isAr ? 'الرصيد بعد الشراء:' : 'Balance After Purchase:'}</span>
                <span className="text-emerald-400">{balanceAfter} Coins</span>
              </div>
            </div>

            {purchaseStatus.error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{purchaseStatus.error}</span>
              </div>
            )}

            {purchaseStatus.success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{purchaseStatus.success}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirmPurchase}
                disabled={purchaseStatus.loading}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] transition-all cursor-pointer shadow-lg disabled:opacity-50"
              >
                {purchaseStatus.loading
                  ? (isAr ? 'جاري المعالجة والتقييد المالي...' : 'Processing Ledger Debit...')
                  : (isAr ? 'تأكيد الشراء والخصم' : 'Confirm Purchase')}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={purchaseStatus.loading}
                className="py-3 px-5 rounded-xl text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
