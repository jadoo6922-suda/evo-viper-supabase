import React from 'react';
import { Send, Loader2, X } from 'lucide-react';

interface MerchantApplicationFormProps {
  isAr: boolean;
  actionLoading: boolean;
  fullName: string;
  setFullName: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  businessDescription: string;
  setBusinessDescription: (val: string) => void;
  portfolioInput: string;
  setPortfolioInput: (val: string) => void;
  portfolioUrls: string[];
  onAddPortfolioUrl: () => void;
  onRemovePortfolioUrl: (idx: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const MerchantApplicationForm: React.FC<MerchantApplicationFormProps> = ({
  isAr,
  actionLoading,
  fullName,
  setFullName,
  phone,
  setPhone,
  businessDescription,
  setBusinessDescription,
  portfolioInput,
  setPortfolioInput,
  portfolioUrls,
  onAddPortfolioUrl,
  onRemovePortfolioUrl,
  onSubmit,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="p-6 sm:p-8 rounded-3xl bg-[#12161d] border border-white/10 space-y-6 shadow-xl"
    >
      <h3 className="text-base font-bold text-white border-b border-white/10 pb-4">
        {isAr ? 'نموذج تقديم طلب تاجر جديد' : 'Merchant Application Form'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/80 block">
            {isAr ? 'الاسم الكامل أو الاسم التجاري *' : 'Full / Business Name *'}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={3}
            maxLength={100}
            placeholder={isAr ? 'مثال: ستوديو الحلول البرمجية' : 'Full Name'}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/80 block">
            {isAr ? 'رقم الهاتف (مع الرمز الدولي) *' : 'Phone Number *'}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="+966500000000"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-white/80 block">
          {isAr ? 'وصف طبيعة المنتجات الرقمية والنشاط *' : 'Business / Product Description *'}
        </label>
        <textarea
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
          required
          minLength={20}
          maxLength={1000}
          rows={4}
          placeholder={
            isAr
              ? 'وضح طبيعة المنتجات الرقمية التي ترغب ببيعها (سكربتات، قوالب، أدوات ذكاء اصطناعي، الخ)...'
              : 'Describe the digital assets you wish to sell...'
          }
          className="w-full p-3.5 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
        />
        <span className="text-[10px] text-white/40 block text-right">
          {businessDescription.length} / 1000
        </span>
      </div>

      {/* Portfolio Links (Up to 5) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/80 block">
          {isAr ? 'عينات أعمال أو روابط خارجية (حد أقصى 5)' : 'Portfolio / Sample Links (Max 5)'}
        </label>

        <div className="flex gap-2">
          <input
            type="url"
            value={portfolioInput}
            onChange={(e) => setPortfolioInput(e.target.value)}
            placeholder="https://github.com/... or https://portfolio.com"
            className="flex-1 px-3.5 py-2 rounded-xl bg-[#0b0d10] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
          />
          <button
            type="button"
            onClick={onAddPortfolioUrl}
            disabled={!portfolioInput.trim() || portfolioUrls.length >= 5}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            {isAr ? 'إضافة رابط' : 'Add Link'}
          </button>
        </div>

        {portfolioUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {portfolioUrls.map((url, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-[#c5a059] flex items-center gap-2"
              >
                <span className="truncate max-w-xs">{url}</span>
                <button
                  type="button"
                  onClick={() => onRemovePortfolioUrl(i)}
                  className="text-white/40 hover:text-rose-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-white/10">
        <button
          type="submit"
          disabled={actionLoading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#c5a059] to-[#9b7b37] hover:brightness-110 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#c5a059]/20"
        >
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{isAr ? 'إرسال طلب الانضمام للمراجعة' : 'Submit Application'}</span>
        </button>
      </div>
    </form>
  );
};
