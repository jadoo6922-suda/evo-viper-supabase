import React, { useState } from 'react';
import { X, Copy, CheckCircle2 } from 'lucide-react';
import { User } from '../../types';

interface TopUpModalProps {
  isAr: boolean;
  currentUser: User | null;
  onClose: () => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isAr,
  currentUser,
  onClose,
}) => {
  const [topUpStatus, setTopUpStatus] = useState<{ loading: boolean; message?: string }>({
    loading: false,
  });

  return (
    <div
      id="topup-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-[#0f1318] border border-[#801428]/60 p-6 sm:p-8 shadow-2xl text-[#f7f7f9] space-y-5 animate-in fade-in zoom-in-95"
      >
        <button
          onClick={onClose}
          className="absolute top-4 ltr:right-4 rtl:left-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/10 border border-[#25D366]/40 flex items-center justify-center text-[#25D366] shadow-lg shadow-[#25D366]/20">
            <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">
            {isAr ? 'شحن رصيد الكوينز عبر الأدمن' : 'Top Up Coins via Admin'}
          </h3>
          <p className="text-xs text-white/60 leading-relaxed">
            {isAr
              ? 'يتم شحن الحساب والتزويد بالكوينز بالتواصل المباشر مع الأدمن المعتمد للمنصة عبر واتساب.'
              : 'Recharge your coins balance directly by contacting the platform Admin on WhatsApp.'}
          </p>
        </div>

        {/* Admin WhatsApp Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#25D366]/10 via-[#128C7E]/5 to-transparent border border-[#25D366]/30 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60 font-medium">
              {isAr ? 'رقم واتساب الأدمن المعتمد:' : 'Admin WhatsApp Contact:'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366] text-[10px] font-bold border border-[#25D366]/30">
              {isAr ? 'متصل للشحن' : 'Online for Top Up'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-[#0b0d10] p-3 rounded-xl border border-white/10">
            <div className="font-mono text-base font-bold text-white tracking-wider dir-ltr">
              +58 426 710 5973
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText('584267105973');
                setTopUpStatus({ loading: false, message: isAr ? 'تم نسخ رقم الواتساب بنجاح!' : 'WhatsApp number copied!' });
                setTimeout(() => setTopUpStatus({ loading: false }), 2500);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-[#c5a059] font-medium transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isAr ? 'نسخ الرقم' : 'Copy'}</span>
            </button>
          </div>

          {/* User Identity to provide to admin */}
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-white/50 space-y-1">
            <span className="block font-semibold text-white/70">
              {isAr ? 'بيانات حسابك لتقديمها للأدمن:' : 'Your Account ID for Admin:'}
            </span>
            <div className="font-mono text-[11px] text-[#c5a059] flex items-center justify-between">
              <span>{currentUser?.email || currentUser?.id || 'User'}</span>
              <span>ID: {currentUser?.id || 'USR-***'}</span>
            </div>
          </div>
        </div>

        {topUpStatus.message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{topUpStatus.message}</span>
          </div>
        )}

        {/* Direct WhatsApp Chat Action */}
        <div className="space-y-2">
          <a
            href={`https://wa.me/584267105973?text=${encodeURIComponent(
              isAr
                ? `مرحباً، أود شحن رصيد كوينز في منصة المتجر الرقمي.\nالبريد الإلكتروني: ${currentUser?.email || ''}\nمعرف الحساب: ${currentUser?.id || ''}`
                : `Hello Admin, I would like to top up coins in DigitalStore.\nEmail: ${currentUser?.email || ''}\nAccount ID: ${currentUser?.id || ''}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#25D366] hover:bg-[#20ba59] shadow-lg shadow-[#25D366]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>{isAr ? 'محادثة الأدمن عبر واتساب للشحن' : 'Chat with Admin on WhatsApp'}</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
