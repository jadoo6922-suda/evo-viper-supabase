import React, { useState } from 'react';
import { Product } from '../../../types';
import { RejectProductModal } from './RejectProductModal';
import { Eye, Loader2 } from 'lucide-react';

interface ProductsReviewTabProps {
  products: Product[];
  isAr: boolean;
  processingId: string | null;
  onReviewProduct: (
    productId: string,
    decision: 'published' | 'rejected' | 'unpublished',
    reason?: string
  ) => Promise<void>;
}

export const ProductsReviewTab: React.FC<ProductsReviewTabProps> = ({
  products,
  isAr,
  processingId,
  onReviewProduct,
}) => {
  const [rejectModalProd, setRejectModalProd] = useState<Product | null>(null);
  const [prodRejectReason, setProdRejectReason] = useState('');

  const handleConfirmRejection = async (productId: string, reason: string) => {
    await onReviewProduct(productId, 'rejected', reason);
    setRejectModalProd(null);
    setProdRejectReason('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white">
          {isAr ? 'طابور المنتجات الرقمية للتجار' : 'Merchant Product Review Queue'}
        </h4>
        <span className="text-xs text-white/40 font-mono">
          {products.length} {isAr ? 'منتج مسجل' : 'items'}
        </span>
      </div>

      {products.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#12161d] border border-white/10 space-y-2">
          <Eye className="w-8 h-8 text-white/20 mx-auto" />
          <div className="text-sm font-bold text-white/60">
            {isAr ? 'لا توجد منتجات لتجار في النظام حالياً' : 'No merchant products yet.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="p-5 rounded-3xl bg-[#12161d] border border-white/10 space-y-4 flex flex-col justify-between hover:border-white/20 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={prod.thumbnail || prod.images[0]}
                    alt={prod.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-white/10 bg-black/40 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-bold text-white truncate">{prod.name}</h5>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prod.status === 'published'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : prod.status === 'pending_review'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : prod.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {prod.status === 'published'
                          ? isAr ? 'منشور ✅' : 'Published'
                          : prod.status === 'pending_review'
                          ? isAr ? 'قيد المراجعة ⏳' : 'Pending Review'
                          : prod.status === 'rejected'
                          ? isAr ? 'مرفوض ❌' : 'Rejected'
                          : prod.status}
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#c5a059] mt-0.5">
                      {prod.price} Coins
                    </div>
                    <div className="text-[10px] text-white/40 truncate font-mono">
                      Seller UID: {prod.sellerId}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-white/70 line-clamp-3 bg-[#0b0d10] p-3 rounded-xl border border-white/5">
                  {prod.description}
                </p>

                {prod.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                    <span className="font-bold block">{isAr ? 'سبب الرفض:' : 'Rejection Reason:'}</span>
                    {prod.rejectionReason}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                {prod.status === 'pending_review' ? (
                  <>
                    <button
                      onClick={() => {
                        setRejectModalProd(prod);
                        setProdRejectReason('');
                      }}
                      disabled={processingId === prod.id}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isAr ? 'رفض مع سبب' : 'Reject'}
                    </button>

                    <button
                      onClick={() => onReviewProduct(prod.id, 'published')}
                      disabled={processingId === prod.id}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                    >
                      {processingId === prod.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        isAr ? 'نشر في المتجر' : 'Publish'
                      )}
                    </button>
                  </>
                ) : prod.status === 'published' ? (
                  <button
                    onClick={() => onReviewProduct(prod.id, 'unpublished')}
                    disabled={processingId === prod.id}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isAr ? 'إلغاء النشر فوراً' : 'Unpublish'}
                  </button>
                ) : (
                  <button
                    onClick={() => onReviewProduct(prod.id, 'published')}
                    disabled={processingId === prod.id}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isAr ? 'إعادة النشر' : 'Re-publish'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModalProd && (
        <RejectProductModal
          product={rejectModalProd}
          isAr={isAr}
          prodRejectReason={prodRejectReason}
          setProdRejectReason={setProdRejectReason}
          processingId={processingId}
          onClose={() => setRejectModalProd(null)}
          onConfirm={handleConfirmRejection}
        />
      )}
    </div>
  );
};
