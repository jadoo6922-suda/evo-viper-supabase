import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Product } from '../../types';

interface MerchantProductModalProps {
  isAr: boolean;
  editingProduct: Product | null;
  actionLoading: boolean;
  onClose: () => void;
  onSave: (productData: {
    title: string;
    description: string;
    price: number;
    category: Product['category'];
    images: string[];
    tags: string[];
  }) => Promise<void>;
}

export const MerchantProductModal: React.FC<MerchantProductModalProps> = ({
  isAr,
  editingProduct,
  actionLoading,
  onClose,
  onSave,
}) => {
  const [prodTitle, setProdTitle] = useState(
    editingProduct ? editingProduct.name || editingProduct.title || '' : ''
  );
  const [prodDesc, setProdDesc] = useState(editingProduct ? editingProduct.description : '');
  const [prodPrice, setProdPrice] = useState<number>(editingProduct ? editingProduct.price : 10);
  const [prodCategory, setProdCategory] = useState<Product['category']>(
    editingProduct ? editingProduct.category : 'development'
  );
  const [prodImages, setProdImages] = useState<string[]>(
    editingProduct
      ? editingProduct.images && editingProduct.images.length > 0
        ? editingProduct.images
        : [editingProduct.thumbnail]
      : ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80']
  );
  const [prodTags, setProdTags] = useState(
    editingProduct ? editingProduct.tags.join(', ') : 'react, typescript, api'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle.trim() || !prodDesc.trim() || prodPrice <= 0) return;
    const tagsArray = prodTags.split(',').map((t) => t.trim()).filter(Boolean);
    await onSave({
      title: prodTitle.trim(),
      description: prodDesc.trim(),
      price: Number(prodPrice),
      category: prodCategory,
      images: prodImages,
      tags: tagsArray,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-[#12161d] border border-white/10 p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h4 className="text-base font-bold text-white">
            {editingProduct
              ? isAr ? 'تعديل بيانات المنتج الرقمي' : 'Edit Digital Product'
              : isAr ? 'رفع منتج رقمي جديد للمراجعة' : 'Upload New Product'}
          </h4>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {editingProduct && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <p className="leading-relaxed">
              {isAr
                ? 'تنبيه أمني: عند تعديل أي حقل، سيعود المنتج تلقائياً إلى طابور المراجعة (pending_review) لضمان مطابقة التعديلات لمعايير النزاهة.'
                : 'Security notice: Any updates will automatically reset this product to the review queue.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 block">
              {isAr ? 'اسم المنتج أو العنوان *' : 'Product Title *'}
            </label>
            <input
              type="text"
              value={prodTitle}
              onChange={(e) => setProdTitle(e.target.value)}
              required
              minLength={3}
              maxLength={150}
              placeholder={isAr ? 'مثال: نظام إدارة المحافظ المشفرة v2' : 'Product Title'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80 block">
                {isAr ? 'السعر (بالـ Coins) *' : 'Price (Coins) *'}
              </label>
              <input
                type="number"
                value={prodPrice}
                onChange={(e) => setProdPrice(Number(e.target.value))}
                required
                min={1}
                max={100000}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#c5a059]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80 block">
                {isAr ? 'التصنيف *' : 'Category *'}
              </label>
              <select
                value={prodCategory}
                onChange={(e) => setProdCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white focus:outline-none focus:border-[#c5a059]"
              >
                <option value="development">{isAr ? 'تطوير وبرمجة' : 'Development'}</option>
                <option value="design">{isAr ? 'تصميم وأصول' : 'Design'}</option>
                <option value="security">{isAr ? 'أمن وسجلات' : 'Security'}</option>
                <option value="ai">{isAr ? 'ذكاء اصطناعي' : 'AI'}</option>
                <option value="finance">{isAr ? 'مالية ومحاسبة' : 'Finance'}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 block">
              {isAr ? 'وصف المنتج بالتفصيل *' : 'Description *'}
            </label>
            <textarea
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              placeholder={isAr ? 'اشرح ميزات المنتج، كيفية التثبيت، والملفات المضمنة...' : 'Product details...'}
              className="w-full p-3.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 block">
              {isAr ? 'رابط صورة الغلاف (Thumbnail URL) *' : 'Cover Image URL *'}
            </label>
            <input
              type="url"
              value={prodImages[0] || ''}
              onChange={(e) => setProdImages([e.target.value])}
              required
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 block">
              {isAr ? 'الكلمات المفتاحية (Tags) مفصولة بفواصل' : 'Tags (comma-separated)'}
            </label>
            <input
              type="text"
              value={prodTags}
              onChange={(e) => setProdTags(e.target.value)}
              placeholder="react, security, api"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#9b7b37] text-black text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#c5a059]/20"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingProduct ? (
                isAr ? 'حفظ التعديلات وإرسال للمراجعة' : 'Update Product'
              ) : (
                isAr ? 'رفع للمراجعة والاعتماد' : 'Submit for Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
