import React, { useState } from 'react';
import { MerchantApplication, User } from '../../../types';
import { MerchantBadgeModal } from './MerchantBadgeModal';
import {
  QrCode,
  Send,
  RefreshCw,
  Ban,
} from 'lucide-react';

interface AccountsTabProps {
  users: User[];
  applications: MerchantApplication[];
  isAr: boolean;
  processingId: string | null;
  onResendActivation: (targetUid: string) => Promise<void>;
  onRegenerateQR: (merchantId: string) => Promise<void>;
  onRevokeLicense: (merchantId: string) => Promise<void>;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({
  users,
  applications,
  isAr,
  processingId,
  onResendActivation,
  onRegenerateQR,
  onRevokeLicense,
}) => {
  const [badgeModalUser, setBadgeModalUser] = useState<User | null>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-[#12161d] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">{isAr ? 'التاجر' : 'Merchant'}</th>
                <th className="p-4">{isAr ? 'رقم الترخيص' : 'License ID'}</th>
                <th className="p-4">{isAr ? 'حالة التفعيل' : 'Activation'}</th>
                <th className="p-4">{isAr ? 'حالة الحساب' : 'Account Status'}</th>
                <th className="p-4 text-center">{isAr ? 'إجراءات الإدارة' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users
                .filter((u) => u.role === 'merchant' || applications.some((a) => a.uid === u.id && a.status === 'approved'))
                .map((u) => {
                  const isActivated = u.role === 'merchant' && !!u.merchantActivatedAt;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="p-4">
                        <div className="font-bold text-white">{u.displayName}</div>
                        <div className="text-[10px] font-mono text-white/40">{u.email}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-amber-300">
                        {u.merchantLicenseId || `LIC-MCH-${u.id.slice(0, 6).toUpperCase()}`}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActivated
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isActivated ? (isAr ? 'مفعّل ✅' : 'Activated') : (isAr ? 'بانتظار التفعيل ⏳' : 'Awaiting Activation')}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : u.status === 'suspended_pending_review'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {u.status === 'suspended_pending_review'
                            ? isAr ? 'معلق بسبب بلاغ ⚠️' : 'Suspended for Review'
                            : u.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* View Badge */}
                          <button
                            onClick={() => setBadgeModalUser(u)}
                            title={isAr ? 'عرض شارة الترخيص والـ QR' : 'View License Badge'}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
                          >
                            <QrCode className="w-4 h-4 text-[#c5a059]" />
                          </button>

                          {/* Resend activation link */}
                          <button
                            onClick={() => onResendActivation(u.id)}
                            disabled={processingId === u.id}
                            title={isAr ? 'إعادة إرسال رابط التفعيل' : 'Resend Activation Link'}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
                          >
                            <Send className="w-4 h-4 text-cyan-400" />
                          </button>

                          {/* Regenerate QR */}
                          <button
                            onClick={() => onRegenerateQR(u.id)}
                            disabled={processingId === u.id}
                            title={isAr ? 'إعادة توليد وثيقة ورمز QR' : 'Regenerate QR'}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4 text-amber-400" />
                          </button>

                          {/* Manual License Revocation */}
                          <button
                            onClick={() => onRevokeLicense(u.id)}
                            disabled={processingId === u.id}
                            title={isAr ? 'إلغاء الترخيص يدويًا' : 'Revoke License'}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {badgeModalUser && (
        <MerchantBadgeModal
          merchant={badgeModalUser}
          isAr={isAr}
          onClose={() => setBadgeModalUser(null)}
        />
      )}
    </div>
  );
};
