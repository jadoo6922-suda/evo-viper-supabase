import React from 'react';
import { Plus, Package, Edit3 } from 'lucide-react';
import { Product } from '../../types';

interface MerchantProductsGridProps {
  myProducts: Product[];
  isAr: boolean;
  onOpenAddProduct: () => void;
  onOpenEditProduct: (prod: Product) => void;
}

export const MerchantProductsGrid: React.FC<MerchantProductsGridProps> = ({
  myProducts,
  isAr,
  onOpenAddProduct,
  onOpenEditProduct,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            {isAr ? 'لوحة منتجاتك الرقمية' : 'My Digital Products'}
          </h3>
          <p className="text-xs text-white/40">
            {isAr
              ? 'المنتجات المعروضة تخضع للمراجعة قبل النشر. أي تعديل يعيد المنتج لطابور المراجعة تلقائياً.'
              : 'Submitted products are reviewed before publishing. Updates automatically reset to review queue.'}
          </p>
        </div>

        <button
          onClick={onOpenAddProduct}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#c5a059] to-[#9b7b37] text-black text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#c5a059]/20"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'رفع منتج جديد للبيع' : 'Upload New Product'}</span>
        </button>
      </div>

      {myProducts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#12161d] border border-white/10 space-y-3">
          <Package className="w-10 h-10 text-white/20 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white/80">
              {isAr ? 'لم تقم برفع أي منتجات بعد' : 'No products uploaded yet'}
            </h4>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              {isAr
                ? 'ابدأ برفع أدواتك البرمجية، تصاميمك، أو حلولك الرقمية لطرحها للبيع المباشر.'
                : 'Start uploading your digital products for verified instant sales.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myProducts.map((prod) => (
            <div
              key={prod.id}
              className="p-5 rounded-3xl bg-[#12161d] border border-white/10 space-y-4 flex flex-col justify-between hover:border-white/20 transition-all"
            >
              <div className="space-y-3">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                  <img
                    src={prod.thumbnail || (prod.images && prod.images[0])}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md ${
                        prod.status === 'published'
                          ? 'bg-emerald-500/80 text-white'
                          : prod.status === 'pending_review'
                          ? 'bg-amber-500/80 text-black'
                          : prod.status === 'rejected'
                          ? 'bg-rose-500/80 text-white'
                          : 'bg-black/60 text-white/70'
                      }`}
                    >
                      {prod.status === 'published'
                        ? isAr ? 'منشور بالمتجر ✅' : 'Published'
                        : prod.status === 'pending_review'
                        ? isAr ? 'قيد المراجعة ⏳' : 'Pending Review'
                        : prod.status === 'rejected'
                        ? isAr ? 'مرفوض ❌' : 'Rejected'
                        : prod.status}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white truncate">{prod.name}</h4>
                  <div className="text-xs font-mono font-bold text-[#c5a059] mt-0.5">
                    {prod.price} Coins
                  </div>
                  <p className="text-xs text-white/60 line-clamp-2 mt-1">
                    {prod.description}
                  </p>
                </div>

                {prod.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                    <span className="font-bold block">{isAr ? 'ملاحظات الإدارة:' : 'Admin Notes:'}</span>
                    {prod.rejectionReason}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                <span className="text-white/40 text-[11px]">
                  {prod.downloadsCount} {isAr ? 'تنزيل' : 'sales'}
                </span>
                <button
                  onClick={() => onOpenEditProduct(prod)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>{isAr ? 'تعديل' : 'Edit'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
