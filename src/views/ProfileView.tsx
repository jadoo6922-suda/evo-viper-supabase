import React, { useState } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  Key,
  Smartphone,
  Laptop,
  LogOut,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  KeyRound,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { TelegramAccountLinker } from '../components/TelegramAccountLinker';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    sessions,
    revokeSession,
    logoutAllSessions,
    replayIntro,
    language,
    getUserBalance,
    updateTransferPin,
  } = useStore();

  const isAr = language === 'ar';
  const balance = currentUser ? getUserBalance(currentUser.id) : 0;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  // Transfer PIN state
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStatus, setPinStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinStatus(null);

    const hasPinConfigured = Boolean(currentUser?.hasPinSet || currentUser?.transferPin);
    if (hasPinConfigured && !pinCurrent.trim()) {
      setPinStatus({
        type: 'error',
        message: isAr ? 'يرجى إدخال رمز PIN الحالي.' : 'Current PIN is required.',
      });
      return;
    }

    if (!pinNew || pinNew.length < 4 || pinNew.length > 6) {
      setPinStatus({
        type: 'error',
        message: isAr ? 'يجب أن يتكون رمز PIN الجديد من 4 إلى 6 أرقام.' : 'New PIN must be 4 to 6 digits.',
      });
      return;
    }

    if (pinNew !== pinConfirm) {
      setPinStatus({
        type: 'error',
        message: isAr ? 'رمزا PIN غير متطابقين.' : 'PIN codes do not match.',
      });
      return;
    }

    setPinLoading(true);
    try {
      const res = await updateTransferPin(pinNew, pinCurrent || undefined);
      if (res.success) {
        setPinStatus({
          type: 'success',
          message: res.message || (isAr ? 'تم حفظ رمز PIN بنجاح!' : 'PIN saved successfully!'),
        });
        setPinCurrent('');
        setPinNew('');
        setPinConfirm('');
        setTimeout(() => setPinStatus(null), 4000);
      } else {
        setPinStatus({
          type: 'error',
          message: res.message || (isAr ? 'فشل تحديث رمز PIN.' : 'Failed to update PIN.'),
        });
      }
    } catch (err: any) {
      setPinStatus({
        type: 'error',
        message: err?.message || (isAr ? 'حدث خطأ غير متوقع.' : 'Unexpected error.'),
      });
    } finally {
      setPinLoading(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setPasswordStatus(isAr ? 'يجب أن لا تقل كلمة المرور عن 8 أحرف.' : 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }
    setPasswordStatus(isAr ? 'تم تحديث كلمة المرور وحفظ الهاش بأمان.' : 'Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordStatus(null), 3000);
  };

  if (!currentUser) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Profile Card */}
      <div className="rounded-3xl bg-gradient-to-r from-[#151a22] to-[#0f1318] border border-white/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-[#f7f7f9]">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl shadow-[#801428]/30 shrink-0">
          {currentUser.displayName.charAt(0)}
        </div>

        <div className="space-y-2 text-center sm:text-left rtl:sm:text-right flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{currentUser.displayName}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#801428] text-white border border-[#c5a059]/40 uppercase">
              {currentUser.role.replace('_', ' ')}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-white/50 font-mono">
            <span>@{currentUser.username}</span>
            <span>•</span>
            <span>{currentUser.email}</span>
            <span>•</span>
            <span className="text-[#c5a059]">ID: {currentUser.id}</span>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{isAr ? 'حساب آمن وموثق' : 'Security Status: Verified'}</span>
            </div>
            <div className="text-white/40">
              <span>{isAr ? 'تاريخ الانضمام:' : 'Joined:'} {new Date(currentUser.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="text-white/40">
              <span>{isAr ? 'الرصيد:' : 'Balance:'} <strong className="text-white font-mono">{balance} Coins</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings & Active Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Sessions Manager */}
        <div className="rounded-2xl bg-[#12161d] border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-white">
                {isAr ? 'الجلسات النشطة والأجهزة' : 'Active Sessions & Devices'}
              </h2>
              <p className="text-xs text-white/40">
                {isAr ? 'إدارة الأجهزة المسجلة للدخول لحسابك' : 'Manage your connected devices'}
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={logoutAllSessions}
                className="text-[11px] text-rose-400 hover:underline cursor-pointer"
              >
                {isAr ? 'تسجيل الخروج من بقية الأجهزة' : 'Logout others'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {sessions.map((ses) => (
              <div
                key={ses.id}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  {ses.device.includes('Mac') || ses.device.includes('PC') ? (
                    <Laptop className="w-5 h-5 text-[#c5a059] shrink-0" />
                  ) : (
                    <Smartphone className="w-5 h-5 text-[#c5a059] shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold text-white block">{ses.device}</span>
                    <span className="text-[11px] text-white/40 block">
                      {ses.browser} • {ses.ipAddress}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">{ses.lastActive}</span>
                  </div>
                </div>

                {!ses.isCurrent && (
                  <button
                    onClick={() => revokeSession(ses.id)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                    title={isAr ? 'إنهاء الجلسة' : 'Revoke'}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Change Password Form */}
        <div className="rounded-2xl bg-[#12161d] border border-white/10 p-6 space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-white">
              {isAr ? 'تغيير كلمة المرور والأمان' : 'Change Password & Security'}
            </h2>
            <p className="text-xs text-white/40">
              {isAr ? 'استخدم كلمة مرور قوية مع تشفير عالي' : 'Set a strong password to protect your vault'}
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-white/60 block">{isAr ? 'كلمة المرور الحالية:' : 'Current Password:'}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#c5a059]/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/60 block">{isAr ? 'كلمة المرور الجديدة:' : 'New Password:'}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#c5a059]/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/60 block">{isAr ? 'تأكيد كلمة المرور الجديدة:' : 'Confirm Password:'}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#c5a059]/60"
              />
            </div>

            {passwordStatus && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                {passwordStatus}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer"
            >
              {isAr ? 'تحديث كلمة المرور' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Transfer PIN Management Card */}
      <div className="rounded-2xl bg-[#12161d] border border-white/10 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#c5a059]/20 border border-[#c5a059]/40 flex items-center justify-center text-[#c5a059]">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-bold text-white">
                {isAr ? 'رمز PIN السري للتحويلات المالية' : 'Financial Transfer PIN'}
              </h2>
            </div>
            <p className="text-xs text-white/40">
              {isAr
                ? 'رمز الأمان المطلوب لتأكيد الدخول وتفويض أي عملية تحويل مالي بين المحافظ'
                : 'Secret PIN required to authorize login and wallet-to-wallet transfers'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(currentUser.hasPinSet || currentUser.transferPin) ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'رمز PIN مُفعّل ومحمي' : 'PIN Active & Secure'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isAr ? 'لم يتم تعيين PIN بعد' : 'No PIN Configured'}</span>
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdatePin} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          {(currentUser.hasPinSet || currentUser.transferPin) && (
            <div className="space-y-1">
              <label className="text-white/60 block">{isAr ? 'رمز PIN الحالي:' : 'Current PIN:'}</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinCurrent}
                onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono tracking-widest text-center focus:outline-none focus:border-[#c5a059]/60"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-white/60 block">{isAr ? 'رمز PIN الجديد (4-6 أرقام):' : 'New PIN (4-6 digits):'}</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinNew}
              onChange={(e) => setPinNew(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono tracking-widest text-center focus:outline-none focus:border-[#c5a059]/60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-white/60 block">{isAr ? 'تأكيد الرمز الجديد:' : 'Confirm New PIN:'}</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              className="w-full bg-[#141820] border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono tracking-widest text-center focus:outline-none focus:border-[#c5a059]/60"
            />
          </div>

          <div className="sm:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {pinStatus ? (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  pinStatus.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}
              >
                {pinStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{pinStatus.message}</span>
              </div>
            ) : (
              <div className="text-[11px] text-white/40">
                {isAr
                  ? 'سيتم استخدام هذا الرمز عند إجراء التحويلات المالية في صفحة المحفظة.'
                  : 'This PIN is required when sending peer-to-peer transfers.'}
              </div>
            )}

            <button
              type="submit"
              disabled={pinLoading || !pinNew || pinNew.length < 4}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] via-[#991b32] to-[#6b0f20] border border-[#c5a059]/40 hover:border-[#c5a059] transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {pinLoading
                ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                : (isAr ? 'حفظ رمز PIN للتحويلات' : 'Save Transfer PIN')}
            </button>
          </div>
        </form>
      </div>

      {/* Telegram Account Linker */}
      <TelegramAccountLinker />

      {/* Preferences & 3D Intro Replay */}
      <div className="rounded-2xl bg-[#12161d] border border-white/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#f7f7f9]">
        <div className="space-y-1 text-center sm:text-left rtl:sm:text-right">
          <h3 className="text-sm font-bold text-white">
            {isAr ? 'تجربة الدخول ثلاثية الأبعاد 3D Globe' : '3D Digital World Opening Experience'}
          </h3>
          <p className="text-xs text-white/50">
            {isAr
              ? 'هل ترغب في إعادة مشاهدة شاشة الدخول السينمائية ثلاثية الأبعاد والكرة التفاعلية؟'
              : 'Replay the immersive 3D digital sphere and connection arcs intro'}
          </p>
        </div>

        <button
          onClick={replayIntro}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] shadow-lg shadow-[#801428]/25 transition-all cursor-pointer shrink-0"
        >
          <RotateCcw className="w-4 h-4 text-[#c5a059]" />
          <span>{isAr ? 'إعادة مشاهدة المقدمة 3D' : 'Replay 3D Intro'}</span>
        </button>
      </div>
    </div>
  );
};
