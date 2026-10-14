import React, { useState } from 'react';
import { X, QrCode as QrIcon, Check, Copy } from 'lucide-react';
import { User } from '../../types';

interface ReceiveModalProps {
  isAr: boolean;
  receiveQrUrl: string;
  activeCodeString: string;
  currentUser: User | null;
  timeLeftSeconds: number;
  formatCountdown: (secs: number) => string;
  onClose: () => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isAr,
  receiveQrUrl,
  activeCodeString,
  currentUser,
  timeLeftSeconds,
  formatCountdown,
  onClose,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  return (
    <div
      id="receive-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl bg-[#0f1318] border border-white/10 p-6 shadow-2xl text-[#f7f7f9] text-center space-y-5 animate-in fade-in zoom-in-95"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-widest text-[#c5a059] font-semibold">
            SECURE RECEIVE
          </span>
          <h3 className="text-lg font-bold text-white">
            {isAr ? 'استقبال الأموال والرصيد' : 'Receive Funds'}
          </h3>
          <p className="text-xs text-white/50">
            {isAr ? 'شارك رمز QR أو الكود المؤقت مع المرسل' : 'Share QR code or temporary code securely'}
          </p>
        </div>

        {/* QR Image Box */}
        <div className="w-48 h-48 mx-auto rounded-2xl bg-white p-3 shadow-xl flex items-center justify-center">
          {receiveQrUrl ? (
            <img src={receiveQrUrl} alt="Receive QR" className="w-full h-full object-contain" />
          ) : (
            <QrIcon className="w-12 h-12 text-[#0b0d10] animate-pulse" />
          )}
        </div>

        {/* Receive Code Copy */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
          <span className="text-[10px] text-white/40 uppercase block">
            {isAr ? 'رمز التحويل المؤقت الخاص بك:' : 'Your Temporary Receive Code:'}
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-base font-bold text-[#c5a059]">
              {activeCodeString || currentUser?.id}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(activeCodeString || currentUser?.id || '');
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <span className="text-[10px] text-white/40 block">
            {isAr ? `ينتهي خلال ${formatCountdown(timeLeftSeconds)}` : `Expires in ${formatCountdown(timeLeftSeconds)}`}
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-medium text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          {isAr ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>
  );
};
