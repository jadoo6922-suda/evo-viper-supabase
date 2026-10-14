import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  ArrowLeft,
  Coins,
  Lock,
  FileCheck2,
  HelpCircle,
} from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';

interface StoreViewProps {
  onSelectProduct: (product: Product) => void;
}

export const StoreView: React.FC<StoreViewProps> = ({ onSelectProduct }) => {
  const { products, language } = useStore();
  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'popular'>('newest');

  const categories = [
    { id: 'all', name: 'جميع المنتجات', nameEn: 'All Products' },
    { id: 'development', name: 'تطوير وسحاب', nameEn: 'Cloud & Dev' },
    { id: 'design', name: 'تصميم وواجهات', nameEn: 'Design Systems' },
    { id: 'security', name: 'الأمن السيبراني', nameEn: 'Cybersecurity' },
    { id: 'finance', name: 'الأنظمة المالية', nameEn: 'Fintech & Ledgers' },
    { id: 'ai', name: 'ذكاء اصطناعي', nameEn: 'AI Agents' },
  ];

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.status === 'published')
      .filter((p) => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'price_low') return a.price - b.price;
        if (sortBy === 'price_high') return b.price - a.price;
        if (sortBy === 'popular') return b.downloadsCount - a.downloadsCount;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="w-full space-y-12 pb-16">
      {/* Luxury Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#141820] to-[#0d0f13] border border-white/10 p-8 sm:p-12 md:p-16 text-center text-[#f7f7f9]">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#801428]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#c5a059]/30 bg-[#801428]/25 text-[#c5a059] text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'منصة المنتجات الرقمية والتحويلات المعتمدة' : 'Enterprise Digital Marketplace & Ledger'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {isAr ? (
              <>
                متجرك الرقمي.. <span className="text-[#c5a059]">مبني على الثقة</span>
              </>
            ) : (
              <>
                Your Digital Store. <span className="text-[#c5a059]">Built Around Trust.</span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto leading-relaxed">
            {isAr
              ? 'تصفح أحدث الأصول البرمجية، قوالب البنية السحابية، ونظم التصميم. كل عملية شراء أو تحويل مقيدة بدقة في دفتر مالي Ledger لمنع التكرار وضمان استلام الملفات.'
              : 'Acquire vetted engineering architectures, UI tokens, and automation suites with atomic ledger balance security and instant signed delivery.'}
          </p>

          {/* Quick Metrics */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left rtl:text-right">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-white/40 block">{isAr ? 'العملة الداخلية' : 'Store Unit'}</span>
              <span className="text-base font-bold text-white">1 Coin = $1.00</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-white/40 block">{isAr ? 'نوع المحفظة' : 'Accounting'}</span>
              <span className="text-base font-bold text-[#c5a059]">Double-Entry</span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-white/40 block">{isAr ? 'التسليم' : 'Delivery'}</span>
              <span className="text-base font-bold text-emerald-400">Instant Signed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Category Filter Controls */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-white/40 absolute top-1/2 -translate-y-1/2 ltr:left-3.5 rtl:right-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث عن اسم المنتج، التقنية، أو الوسم...' : 'Search products, tags, tech stacks...'}
              className="w-full bg-[#12161d] border border-white/10 rounded-2xl py-3 ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#c5a059]/60 transition-colors"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">{isAr ? 'الترتيب حسب:' : 'Sort:'}</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-[#12161d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-[#c5a059]/60 cursor-pointer"
            >
              <option value="newest">{isAr ? 'الأحدث أولاً' : 'Newest'}</option>
              <option value="popular">{isAr ? 'الأكثر طلباً' : 'Most Popular'}</option>
              <option value="price_low">{isAr ? 'السعر (من الأقل)' : 'Price: Low to High'}</option>
              <option value="price_high">{isAr ? 'السعر (من الأعلى)' : 'Price: High to Low'}</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-[#801428] to-[#590e1c] text-white border border-[#c5a059]/40 shadow-md shadow-[#801428]/30 font-semibold'
                  : 'bg-[#12161d] text-white/60 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {isAr ? cat.name : cat.nameEn}
            </button>
          ))}
        </div>
      </section>

      {/* Product Cards Grid: strictly adhering to user intent:
          "كل Product Card تحتوي فقط على:
           - صورة.
           - اسم المنتج.
           - السعر.
           - Badge عند الحاجة."
      */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {isAr ? 'المنتجات الرقمية المتاحة' : 'Available Digital Products'}
          </h2>
          <span className="text-xs text-white/40">
            {filteredProducts.length} {isAr ? 'منتجات معتمدة' : 'verified assets'}
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <HelpCircle className="w-8 h-8 text-white/20 mx-auto" />
            <p className="text-sm text-white/60">
              {isAr ? 'لم يتم العثور على أي منتجات مطابقة لخيارات البحث.' : 'No products found matching your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="group relative rounded-2xl overflow-hidden bg-[#12161d] border border-white/10 hover:border-[#c5a059]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#801428]/10 cursor-pointer flex flex-col"
              >
                {/* 1. Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#1a1f29]">
                  <img
                    src={product.thumbnail}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12161d] via-transparent to-transparent opacity-80" />

                  {/* 4. Badge (عند الحاجة) */}
                  <div className="absolute top-3 ltr:left-3 rtl:right-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#801428] text-[#f7f7f9] border border-[#c5a059]/40 shadow-sm">
                      {product.category}
                    </span>
                    {product.downloadsCount > 300 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#c5a059] text-[#0b0d10]">
                        {isAr ? 'الأكثر طلباً' : 'Bestseller'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content: 2. Name & 3. Price */}
                <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                  <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-[#c5a059] transition-colors line-clamp-2">
                    {isAr ? product.name : product.nameEn}
                  </h3>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-extrabold text-white">{product.price}</span>
                      <span className="text-xs font-semibold text-[#c5a059]">COINS</span>
                    </div>

                    <span className="text-xs font-medium text-white/50 group-hover:text-white transition-colors flex items-center gap-1">
                      {isAr ? 'عرض التفاصيل' : 'Details'}
                      {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How it Works Section */}
      <section className="rounded-3xl bg-[#12161d]/80 border border-white/10 p-8 md:p-10 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">
            {isAr ? 'دورة الشراء والتسليم' : 'Workflow Architecture'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {isAr ? 'كيف يعمل المتجر الرقمي؟' : 'How the Digital Store Works'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 text-center">
            <div className="w-10 h-10 rounded-xl mx-auto bg-[#801428]/30 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059] font-bold">
              1
            </div>
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'اختيار الأصل الرقمي' : 'Select Digital Asset'}
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              {isAr
                ? 'فحص المواصفات الفنية، حجم الملف، والتوافق قبل اتخاذ قرار الشراء.'
                : 'Inspect complete specifications, file sizes, and licensing rights.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 text-center">
            <div className="w-10 h-10 rounded-xl mx-auto bg-[#801428]/30 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059] font-bold">
              2
            </div>
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'القيد الذري في Ledger' : 'Atomic Ledger Settlement'}
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              {isAr
                ? 'خصم الرصيد مرة واحدة فقط بحركة Debit موثقة وبمنع كامل لـ Race Conditions.'
                : 'Balance is debited in a strict atomic transaction preventing double-spend.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 text-center">
            <div className="w-10 h-10 rounded-xl mx-auto bg-[#801428]/30 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059] font-bold">
              3
            </div>
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'تسليم مشفر Signed URL' : 'Encrypted Signed Delivery'}
            </h3>
            <p className="text-xs text-white/50 leading-relaxed">
              {isAr
                ? 'توليد رابط تحميل خاص مؤقت بالمنتج وحفظه للأبد في قسم مكتبتي الرقمية.'
                : 'Instant access via temporary signed URLs stored inside your private library.'}
            </p>
          </div>
        </div>
      </section>

      {/* Security Guarantees */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#12161d] border border-white/10 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">{isAr ? 'دفتر مالي لا يتلاعب به' : 'Immutable Ledger'}</h4>
            <p className="text-[11px] text-white/50">{isAr ? 'قيد محاسبي مزدوج لكل عملة' : 'Double-entry audit trails'}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#12161d] border border-white/10 flex items-start gap-3">
          <FileCheck2 className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">{isAr ? 'إيصالات بنظام QR' : 'Cryptographic Receipts'}</h4>
            <p className="text-[11px] text-white/50">{isAr ? 'بصمة تحقق فريدة لكل معاملة' : 'Real-time verify QR codes'}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#12161d] border border-white/10 flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">{isAr ? 'حماية ضد النصب' : 'Dispute Center'}</h4>
            <p className="text-[11px] text-white/50">{isAr ? 'فحص أدلة التحويل بـ OCR' : 'Automated image verification'}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#12161d] border border-white/10 flex items-start gap-3">
          <Zap className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">{isAr ? 'رموز تحويل مؤقتة' : '10-Minute Expiring Codes'}</h4>
            <p className="text-[11px] text-white/50">{isAr ? 'إبطال تلقائي بعد 10 دقائق' : 'Single-use cryptorandom codes'}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
