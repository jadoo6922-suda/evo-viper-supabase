import React, { useState } from 'react';
import {
  ShieldCheck,
  Coins,
  Bell,
  User as UserIcon,
  Globe,
  Sliders,
  Check,
  LogOut,
  ChevronDown,
  ShoppingBag,
  FolderLock,
  Scale,
  Search,
  RotateCcw,
  Store,
  Award,
  MessageCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Navbar: React.FC = () => {
  const {
    language,
    toggleLanguage,
    currentUser,
    users,
    switchUser,
    logout,
    activeTab,
    setActiveTab,
    getUserBalance,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    emergencySettings,
    replayIntro,
  } = useStore();

  const isAr = language === 'ar';
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const balance = currentUser ? getUserBalance(currentUser.id) : 0;
  const isAdmin = Boolean(currentUser && ['super_admin', 'admin', 'support', 'moderator', 'finance', 'product_manager'].includes(currentUser.role));

  const userNotifications = notifications.filter(
    (n) => !currentUser || n.userId === currentUser.id
  );

  return (
    <>
      {/* Emergency Mode Banner */}
      {emergencySettings.maintenanceMode && (
        <div className="w-full bg-[#801428] text-white py-1.5 px-4 text-center text-xs font-semibold tracking-wide border-b border-[#c5a059]/40 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c5a059] animate-ping" />
          <span>
            {isAr
              ? 'تنبيه إداري: النظام المالي يخضع للصيانة المجدولة حالياً'
              : 'System Notice: Financial platform is operating under maintenance mode'}
          </span>
        </div>
      )}

      {/* Main Top Header */}
      <header className="sticky top-0 z-30 w-full bg-[#0b0d10]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveTab('store')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center shadow-md shadow-[#801428]/30">
              <ShieldCheck className="w-5 h-5 text-[#c5a059]" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-sm tracking-wide text-white">
                DIGITAL<span className="text-[#c5a059]">STORE</span>
              </span>
              <span className="block text-[9px] text-[#c5a059]/70 tracking-widest uppercase">
                {isAr ? 'المنصة الرقمية المعتمدة' : 'Official Ledger'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('store')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'store'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {isAr ? 'المتجر' : 'Store'}
            </button>

            <button
              onClick={() => setActiveTab('wallet')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'wallet'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{isAr ? 'المحفظة' : 'Wallet'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#801428]/70 text-[#c5a059] font-mono text-[10px] border border-[#c5a059]/30">
                {balance}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {isAr ? 'الطلبات' : 'Orders'}
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {isAr ? 'مكتبتي' : 'Library'}
            </button>

            <button
              onClick={() => setActiveTab('disputes')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'disputes'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {isAr ? 'النزاعات' : 'Disputes'}
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'verify'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {isAr ? 'التحقق من الإيصال' : 'Verify'}
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'support' ? 'bg-white/10 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{isAr ? 'الدعم' : 'Support'}</span>
            </button>

            {/* Merchant Portal */}
            <button
              onClick={() => setActiveTab('merchant')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'merchant'
                  ? 'bg-[#c5a059] text-black font-bold shadow-md shadow-[#c5a059]/20'
                  : 'text-[#c5a059] hover:bg-[#c5a059]/10 border border-[#c5a059]/30'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>
                {currentUser?.role === 'merchant'
                  ? isAr ? 'لوحة التاجر' : 'Merchant'
                  : isAr ? 'بوابة التجار' : 'Become Merchant'}
              </span>
            </button>

            {/* Admin Dashboard link (Only visible to verified admins) */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#801428] text-white font-semibold border border-[#c5a059]/50'
                    : 'text-[#c5a059] hover:bg-[#801428]/30 border border-[#c5a059]/20'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isAr ? 'لوحة الإدارة' : 'Admin'}</span>
              </button>
            )}
          </nav>

          {/* Right Actions: Language, Notifications, User Menu */}
          <div className="flex items-center gap-2.5">
            {/* Wallet Balance pill for mobile & quick view */}
            <button
              onClick={() => setActiveTab('wallet')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-[#c5a059]" />
              <span className="font-mono">{balance}</span>
              <span className="text-[10px] text-[#c5a059] font-normal">Coins</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-colors text-xs font-medium cursor-pointer"
              title={isAr ? 'Switch to English' : 'التحويل للعربية'}
            >
              {isAr ? 'EN' : 'عربي'}
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#801428] ring-2 ring-[#0b0d10]" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full mt-2 ltr:right-0 rtl:left-0 w-80 rounded-2xl bg-[#0f1318] border border-white/10 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-white">
                      {isAr ? 'الإشعارات' : 'Notifications'}
                    </span>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] text-[#c5a059] hover:underline cursor-pointer"
                      >
                        {isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {userNotifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-white/40">
                        {isAr ? 'لا توجد إشعارات جديدة' : 'No notifications'}
                      </div>
                    ) : (
                      userNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            if (n.linkTab) setActiveTab(n.linkTab);
                            setShowNotifications(false);
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            n.isRead
                              ? 'bg-white/[0.01] border-white/5 text-white/60'
                              : 'bg-white/[0.05] border-[#801428]/40 text-white shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-[11px] text-[#c5a059]">
                              {isAr ? n.title : n.titleEn}
                            </span>
                            <span className="text-[9px] text-white/30">
                              {new Date(n.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/70 leading-relaxed">
                            {isAr ? n.message : n.messageEn}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Current User Profile & Quick Demo Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center text-white text-xs font-bold">
                  {currentUser?.displayName.charAt(0) || 'U'}
                </div>
                <div className="text-left rtl:text-right hidden sm:block">
                  <span className="text-xs font-semibold text-white block leading-tight truncate max-w-[90px]">
                    {currentUser?.displayName}
                  </span>
                  <span className="text-[10px] text-[#c5a059] block leading-tight capitalize">
                    {currentUser?.role.replace('_', ' ')}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/50" />
              </button>

              {showUserMenu && (
                <div className="absolute top-full mt-2 ltr:right-0 rtl:left-0 w-64 rounded-2xl bg-[#0f1318] border border-white/10 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 space-y-3">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white block truncate">
                        {currentUser?.displayName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#801428]/50 text-[#c5a059] border border-[#c5a059]/30">
                        {currentUser?.role === 'super_admin' ? (isAr ? 'مدير عام' : 'Super Admin') : (isAr ? 'عميل' : 'Customer')}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/50 block font-mono truncate">
                      {currentUser?.email}
                    </span>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-white/40">
                      <span>ID: {currentUser?.id}</span>
                      <span className="text-[#c5a059] font-medium">{balance} Coins</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2 space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>{isAr ? 'الملف الشخصي والأمان' : 'Profile & Security'}</span>
                    </button>

                    <button
                      onClick={() => {
                        replayIntro();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إعادة مشاهدة المقدمة 3D' : 'Replay 3D Intro'}</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تسجيل الخروج' : 'Log Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
