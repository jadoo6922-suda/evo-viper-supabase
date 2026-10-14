import React from 'react';
import { Store, Wallet, PackageCheck, FolderLock, User, Sliders, Award, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, language, currentUser, getUserBalance } = useStore();
  const isAr = language === 'ar';
  const balance = currentUser ? getUserBalance(currentUser.id) : 0;
  const isAdmin = Boolean(currentUser && ['super_admin', 'admin', 'support', 'moderator', 'finance', 'product_manager'].includes(currentUser.role));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0b0d10]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex items-center justify-around">
      <button
        onClick={() => setActiveTab('store')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'store' ? 'text-white' : 'text-white/50 hover:text-white/80'
        }`}
      >
        <Store className={`w-5 h-5 ${activeTab === 'store' ? 'text-[#c5a059]' : ''}`} />
        <span className="text-[10px] font-medium">{isAr ? 'المتجر' : 'Store'}</span>
      </button>

      <button
        onClick={() => setActiveTab('wallet')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl relative transition-all cursor-pointer ${
          activeTab === 'wallet' ? 'text-white' : 'text-white/50 hover:text-white/80'
        }`}
      >
        <Wallet className={`w-5 h-5 ${activeTab === 'wallet' ? 'text-[#c5a059]' : ''}`} />
        <span className="text-[10px] font-medium">{isAr ? 'المحفظة' : 'Wallet'}</span>
        {balance > 0 && (
          <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-[#801428]" />
        )}
      </button>

      <button
        onClick={() => setActiveTab('merchant')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'merchant' ? 'text-white' : 'text-white/50 hover:text-white/80'
        }`}
      >
        <Award className={`w-5 h-5 ${activeTab === 'merchant' ? 'text-[#c5a059]' : ''}`} />
        <span className="text-[10px] font-medium">{isAr ? 'التاجر' : 'Merchant'}</span>
      </button>

      <button
        onClick={() => setActiveTab('orders')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'orders' ? 'text-white' : 'text-white/50 hover:text-white/80'
        }`}
      >
        <PackageCheck className={`w-5 h-5 ${activeTab === 'orders' ? 'text-[#c5a059]' : ''}`} />
        <span className="text-[10px] font-medium">{isAr ? 'الطلبات' : 'Orders'}</span>
      </button>

      <button
        onClick={() => setActiveTab('library')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'library' ? 'text-white' : 'text-white/50 hover:text-white/80'
        }`}
      >
        <FolderLock className={`w-5 h-5 ${activeTab === 'library' ? 'text-[#c5a059]' : ''}`} />
        <span className="text-[10px] font-medium">{isAr ? 'مكتبتي' : 'Library'}</span>
      </button>

      <button
        onClick={() => setActiveTab('support')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${activeTab === 'support' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
      >
        <MessageCircle className={`w-5 h-5 ${activeTab === 'support' ? 'text-[#c5a059]' : ''}`} />
        <span className="text-[10px] font-medium">{isAr ? 'الدعم' : 'Support'}</span>
      </button>

      <button
        onClick={() => setActiveTab(isAdmin ? 'admin' : 'profile')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === 'admin' || activeTab === 'profile'
            ? 'text-white'
            : 'text-white/50 hover:text-white/80'
        }`}
      >
        {isAdmin ? (
          <Sliders className={`w-5 h-5 ${activeTab === 'admin' ? 'text-[#c5a059]' : ''}`} />
        ) : (
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-[#c5a059]' : ''}`} />
        )}
        <span className="text-[10px] font-medium">
          {isAdmin ? (isAr ? 'الإدارة' : 'Admin') : (isAr ? 'حسابي' : 'Profile')}
        </span>
      </button>
    </nav>
  );
};
