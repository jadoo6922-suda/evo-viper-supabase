import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, ShieldAlert, CheckCircle2, Copy, Check, ExternalLink, Award, Sparkles } from 'lucide-react';
import { User } from '../types';

interface MerchantBadgeCardProps {
  merchant: User;
  licenseId?: string;
  isAr?: boolean;
}

export const MerchantBadgeCard: React.FC<MerchantBadgeCardProps> = ({
  merchant,
  licenseId,
  isAr = true,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const displayLicenseId =
    licenseId ||
    merchant.merchantLicenseId ||
    `LIC-MCH-${merchant.id.slice(0, 8).toUpperCase()}`;

  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?verify_merchant=${encodeURIComponent(merchant.id)}`;

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: '#0b0d10',
        light: '#f5efe6',
      },
    })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [verifyUrl]);

  const copyVerificationLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuspended =
    merchant.status === 'suspended' || merchant.status === 'suspended_pending_review';
  const isBanned = merchant.status === 'banned';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1611] via-[#12161d] to-[#0c0e12] border-2 border-[#c5a059]/40 p-6 sm:p-8 shadow-2xl">
      {/* Background Decorative Guilloche pattern & Watermark */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#c5a059]/5 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#801428]/10 blur-2xl pointer-events-none" />

      {/* Top Header with Golden Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c5a059] to-[#8f6d2b] p-0.5 shadow-lg shadow-[#c5a059]/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#12161d] rounded-[14px] flex items-center justify-center text-[#c5a059]">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">
                {isAr ? 'رخصة تاجر رقمي معتمد' : 'Verified Digital Merchant'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#c5a059]/15 text-[#e5be74] border border-[#c5a059]/30">
                Official
              </span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
              {merchant.displayName || merchant.username}
            </h3>
          </div>
        </div>

        {/* Live Status Badge */}
        <div>
          {isBanned ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <ShieldAlert className="w-3.5 h-3.5" />
              {isAr ? 'الترخيص ملغى ومسحوب' : 'License Revoked'}
            </span>
          ) : isSuspended ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <ShieldAlert className="w-3.5 h-3.5" />
              {isAr ? 'معلق قيد المراجعة' : 'Suspended for Review'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isAr ? 'ترخيص نشط وموثق' : 'Active & Verified'}
            </span>
          )}
        </div>
      </div>

      {/* Main License Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-white/10 relative z-10">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-white/40 block">
            {isAr ? 'رقم وثيقة الترخيص' : 'License ID'}
          </span>
          <div className="text-sm font-mono font-bold text-amber-300 tracking-wider">
            {displayLicenseId}
          </div>
          <span className="text-[10px] text-white/30 block">
            {isAr ? 'مسجل ومشفر بالدفتر' : 'Cryptographically Stamped'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-white/40 block">
            {isAr ? 'تاريخ التفعيل والانضمام' : 'Activation Date'}
          </span>
          <div className="text-sm font-mono font-medium text-white/90">
            {merchant.merchantActivatedAt
              ? new Date(merchant.merchantActivatedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : new Date(merchant.createdAt || Date.now()).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
          </div>
          <span className="text-[10px] text-emerald-400/80 block">
            {isAr ? 'ضمان مالي محجوز 25 Coin' : '25 Coins Security Bond'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-white/40 block">
            {isAr ? 'معرف الحساب' : 'Account ID'}
          </span>
          <div className="text-xs font-mono text-white/60 truncate" title={merchant.id}>
            {merchant.id}
          </div>
          <span className="text-[10px] text-white/40 block font-mono">
            {merchant.email}
          </span>
        </div>
      </div>

      {/* Footer Section with Live Verification QR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 relative z-10">
        <div className="flex items-center gap-4">
          {qrUrl ? (
            <div className="p-2 rounded-2xl bg-[#f5efe6] shadow-xl border border-white/20">
              <img
                src={qrUrl}
                alt="Merchant Verification QR"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-contain"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-white/5 animate-pulse" />
          )}

          <div className="space-y-1.5 max-w-xs">
            <span className="text-xs font-bold text-white block">
              {isAr ? 'رمز التحقق الفوري (QR)' : 'Live Verification QR'}
            </span>
            <p className="text-[11px] text-white/50 leading-relaxed">
              {isAr
                ? 'امسح الرمز أو شارك الرابط للتحقق اللحظي من سريان الترخيص مباشرة من قاعدة البيانات الرسمية.'
                : 'Scan or visit link for live real-time verification directly from the immutable registry.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col w-full sm:w-auto sm:flex-row items-center gap-2.5">
          <button
            onClick={copyVerificationLink}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/90 border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'تم نسخ الرابط' : 'Link Copied'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white/60" />
                <span>{isAr ? 'نسخ رابط التحقق' : 'Copy Verify URL'}</span>
              </>
            )}
          </button>

          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#9b7b37] hover:brightness-110 text-xs font-bold text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#c5a059]/20"
          >
            <ExternalLink className="w-3.5 h-3.5 text-black" />
            <span>{isAr ? 'صفحة الفحص العلنية' : 'Open Public Check'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
