import React, { useState } from 'react';
import { AppProviders } from './context/AppProviders';
import { useStore } from './context/useStore';
import { OpeningGlobe } from './components/OpeningGlobe';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { ReceiptModal } from './components/ReceiptModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { StoreView } from './views/StoreView';
import { WalletView } from './views/WalletView';
import { MyLibraryView } from './views/MyLibraryView';
import { OrdersView } from './views/OrdersView';
import { DisputesView } from './views/DisputesView';
import { VerificationView } from './views/VerificationView';
import { ProfileView } from './views/ProfileView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { PublicVerifyView } from './views/PublicVerifyView';
import { MerchantPortalView } from './views/MerchantPortalView';
import { SupportView } from './views/SupportView';
import { LegalView, type LegalSection } from './views/LegalView';
import { AuthScreen } from './components/AuthScreen';
import { AdminAccessPortal } from './components/AdminAccessPortal';
import { BootstrapSuperAdminScreen } from './components/BootstrapSuperAdminScreen';
import { Product, Transaction } from './types';
import { ShieldCheck, AlertOctagon, ArrowUpRight, Lock, CheckCircle2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    hasSeenIntro,
    setHasSeenIntro,
    activeTab,
    setActiveTab,
    language,
    emergencySettings,
    currentUser,
  } = useStore();

  const isAr = language === 'ar';

  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('merchant_activation') === '1') {
      setActiveTab('merchant');
      url.searchParams.delete('merchant_activation');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [setActiveTab]);

  const [legalSection, setLegalSection] = useState<LegalSection>(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('legal');
      if (q === 'terms' || q === 'kyc' || q === 'privacy') return q;
    } catch {}
    return 'privacy';
  });

  React.useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('legal');
      if (q === 'terms' || q === 'kyc' || q === 'privacy') {
        setLegalSection(q);
        setActiveTab('legal');
      }
    } catch {}
  }, [setActiveTab]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);
  const [publicVerifyTxId, setPublicVerifyTxId] = useState<string | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const qVerify = searchParams.get('verify');
      if (qVerify) return qVerify;
      if (window.location.hash.startsWith('#verify/')) {
        return window.location.hash.replace('#verify/', '').split('?')[0];
      }
    } catch {}
    return null;
  });

  const [publicVerifyMerchantId, setPublicVerifyMerchantId] = useState<string | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const qMerchant = searchParams.get('verify_merchant');
      if (qMerchant) return qMerchant;
      if (window.location.hash.startsWith('#verify_merchant/')) {
        return window.location.hash.replace('#verify_merchant/', '').split('?')[0];
      }
    } catch {}
    return null;
  });

  React.useEffect(() => {
    const handleUrlChange = () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const qVerify = searchParams.get('verify');
        if (qVerify) {
          setPublicVerifyTxId(qVerify);
          return;
        }
        if (window.location.hash.startsWith('#verify/')) {
          setPublicVerifyTxId(window.location.hash.replace('#verify/', '').split('?')[0]);
          return;
        }
        setPublicVerifyTxId(null);

        const qMerchant = searchParams.get('verify_merchant');
        if (qMerchant) {
          setPublicVerifyMerchantId(qMerchant);
          return;
        }
        if (window.location.hash.startsWith('#verify_merchant/')) {
          setPublicVerifyMerchantId(window.location.hash.replace('#verify_merchant/', '').split('?')[0]);
          return;
        }
        setPublicVerifyMerchantId(null);
      } catch {}
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Public QR Code Scan Verification: Accessible immediately without authentication
  if (publicVerifyMerchantId) {
    return (
      <PublicVerifyView
        merchantId={publicVerifyMerchantId}
        onBackToApp={() => {
          window.history.replaceState({}, '', '/');
          setPublicVerifyMerchantId(null);
        }}
      />
    );
  }

  if (publicVerifyTxId) {
    return (
      <PublicVerifyView
        txId={publicVerifyTxId}
        onBackToApp={() => {
          window.history.replaceState({}, '', '/');
          setPublicVerifyTxId(null);
        }}
      />
    );
  }

  // Daily private admin gateway lives inside this same site at /admin/<daily-token>.
  if (/^\/admin\/[A-Za-z0-9_-]{40,60}\/?$/.test(window.location.pathname)) {
    return <AdminAccessPortal />;
  }

  const params = new URLSearchParams(window.location.search);
  // Compatibility redirect for an old gateway URL; new daily links use /admin/<token>.
  if (window.location.pathname.replace(/\/+$/, '') === '/admin-access' || params.get('gate') === '1') {
    window.history.replaceState({}, '', '/');
  }

  // Temporary Super Admin Bootstrap Screen (Phase A)
  const setupMode = params.get('setup') === '1';
  if (setupMode) {
    return <BootstrapSuperAdminScreen setupSecret="" />;
  }

  const isAdmin = Boolean(currentUser && ['super_admin', 'admin', 'support', 'moderator', 'finance', 'product_manager'].includes(currentUser.role));

  // Automatically switch tab to admin when an admin logs in
  const prevAdminRef = React.useRef(isAdmin);
  React.useEffect(() => {
    if (!prevAdminRef.current && isAdmin) {
      setActiveTab('admin');
      setHasSeenIntro(true);
    }
    prevAdminRef.current = isAdmin;
  }, [isAdmin, setActiveTab, setHasSeenIntro]);

  React.useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('store');
    }
  }, [activeTab, isAdmin, setActiveTab]);

  // If user hasn't completed or skipped the intro globe, render full 3D opening
  if (!hasSeenIntro) {
    return <OpeningGlobe onEnter={() => setHasSeenIntro(true)} />;
  }

  // Mandatory Authentication: User must sign in or register before accessing the store/platform
  if (!currentUser) {
    if (activeTab === 'legal') {
      return (
        <div className="min-h-screen bg-[#0b0d10] text-white">
          <LegalView initialSection={legalSection} onClose={() => setActiveTab('store')} />
        </div>
      );
    }
    return <AuthScreen />;
  }

  const handleOpenReceiptFromProduct = (tx: Transaction) => {
    setSelectedReceiptTx(tx);
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#f7f7f9] flex flex-col selection:bg-[#801428] selection:text-white">
      {/* Top Fixed Luxury Navigation */}
      <Navbar />

      {/* Emergency Global Alert Banners (if activated by admin) */}
      {emergencySettings.maintenanceMode && (
        <div className="bg-rose-900/90 text-white px-4 py-2 text-center text-xs font-bold border-b border-rose-500/40 flex items-center justify-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-200" />
          <span>
            {isAr
              ? 'تنبيه إداري: النظام في وضع الصيانة الاستثنائية وفحص السجلات. بعض العمليات قد تكون مقيدة مؤقتاً.'
              : 'Maintenance Mode Active: Security ledger audit in progress. Transactions may be restricted.'}
          </span>
        </div>
      )}

      {emergencySettings.pauseTransfers && (
        <div className="bg-amber-900/80 text-amber-200 px-4 py-1.5 text-center text-xs font-semibold border-b border-amber-600/30 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          <span>
            {isAr
              ? 'تنويه: تم إيقاف التحويلات بين الأفراد P2P مؤقتاً بأمر الإدارة.'
              : 'Notice: P2P transfers are temporarily paused by administration.'}
          </span>
        </div>
      )}

      {/* Main Dynamic View Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {activeTab === 'store' && (
          <StoreView onSelectProduct={(prod) => setSelectedProduct(prod)} />
        )}

        {activeTab === 'wallet' && (
          <WalletView
            onOpenReceipt={(tx) => setSelectedReceiptTx(tx)}
            onNavigateToDisputes={() => setActiveTab('disputes')}
          />
        )}

        {activeTab === 'library' && <MyLibraryView />}

        {activeTab === 'orders' && (
          <OrdersView
            onOpenDisputeForOrder={(ord) => {
              setActiveTab('disputes');
            }}
            onNavigateToLibrary={() => setActiveTab('library')}
          />
        )}

        {activeTab === 'disputes' && <DisputesView />}

        {activeTab === 'verification' && (
          <VerificationView onOpenReceiptModal={(tx) => setSelectedReceiptTx(tx)} />
        )}

        {activeTab === 'profile' && <ProfileView />}
        {activeTab === 'legal' && (
          <LegalView initialSection={legalSection} onClose={() => setActiveTab('store')} />
        )}

        {activeTab === 'merchant' && (
          <MerchantPortalView onNavigateToWallet={() => setActiveTab('wallet')} />
        )}

        {activeTab === 'admin' && <AdminDashboardView />}
      </main>

      {/* Global Product Detail & Atomic Purchase Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onViewReceipt={handleOpenReceiptFromProduct}
        />
      )}

      {/* Global Official Receipt Modal */}
      {selectedReceiptTx && (
        <ReceiptModal
          transaction={selectedReceiptTx}
          onClose={() => setSelectedReceiptTx(null)}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />

      {/* Enterprise Footer */}
      <footer className="border-t border-white/5 bg-[#08090c] py-10 px-4 sm:px-6 lg:px-8 mt-auto mb-14 lg:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/40">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#801428] to-[#450a16] border border-[#c5a059]/40 flex items-center justify-center font-serif text-[#c5a059] font-bold text-xs">
              D
            </div>
            <div>
              <span className="font-bold text-white block">DigitalStore Ecosystem</span>
              <span className="text-[11px] text-white/40">
                {isAr ? 'منصة الأصول الرقمية والمحفظة المشفرة' : 'Decentralized Architecture & Ledger'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px]">
            <button
              onClick={() => setActiveTab('verification')}
              className="hover:text-[#c5a059] transition-colors cursor-pointer"
            >
              {isAr ? 'التحقق من الإيصالات' : 'Verify Receipts'}
            </button>
            <button
              onClick={() => setActiveTab('disputes')}
              className="hover:text-[#c5a059] transition-colors cursor-pointer"
            >
              {isAr ? 'مركز النزاعات' : 'Disputes'}
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className="hover:text-[#c5a059] transition-colors cursor-pointer"
            >
              {isAr ? 'دفتر الـ Ledger' : 'Ledger System'}
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className="hover:text-[#c5a059] transition-colors cursor-pointer"
            >
              {isAr ? 'الكتالوج' : 'Catalog'}
            </button>
            <button
              onClick={() => { setLegalSection('privacy'); setActiveTab('legal'); }}
              className="hover:text-[#c5a059] transition-colors cursor-pointer"
            >
              {isAr ? 'الخصوصية' : 'Privacy'}
            </button>
            <button
              onClick={() => { setLegalSection('terms'); setActiveTab('legal'); }}
              className="hover:text-[#c5a059] transition-colors cursor-pointer"
            >
              {isAr ? 'الشروط' : 'Terms'}
            </button>
            <button
              onClick={() => { setLegalSection('kyc'); setActiveTab('legal'); }}
              className="hover:text-[#c5a059] transition-colors cursor-pointer"
            >
              KYC
            </button>
          </div>

          <div className="text-center md:text-right rtl:md:text-left text-[11px] text-white/30">
            <span>© {new Date().getFullYear()} DigitalStore. All rights reserved.</span>
            <span className="block text-[10px] text-white/20 mt-0.5">
              Strictly Internal Double-Entry Ledger System (1 Coin = 1.00 USD)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProviders>
      <MainAppContent />
    </AppProviders>
  );
}
