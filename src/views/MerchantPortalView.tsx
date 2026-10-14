import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../context/StoreContext';
import { MerchantApplication, MerchantDeposit, Product } from '../types';
import { MerchantBadgeCard } from '../components/MerchantBadgeCard';
import {
  Store,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { MerchantSuspendedAlert } from './merchant-portal/MerchantSuspendedAlert';
import { MerchantDepositCard } from './merchant-portal/MerchantDepositCard';
import { MerchantProductsGrid } from './merchant-portal/MerchantProductsGrid';
import { MerchantProductModal } from './merchant-portal/MerchantProductModal';
import { MerchantApplicationStatus } from './merchant-portal/MerchantApplicationStatus';
import { MerchantApplicationForm } from './merchant-portal/MerchantApplicationForm';

interface MerchantPortalViewProps {
  onNavigateToWallet?: () => void;
}

export const MerchantPortalView: React.FC<MerchantPortalViewProps> = ({ onNavigateToWallet }) => {
  const { currentUser, language, getUserBalance, products, refreshCurrentUser } = useStore();
  const isAr = language === 'ar';

  // Application state
  const [myApplication, setMyApplication] = useState<MerchantApplication | null>(null);
  const [myDeposit, setMyDeposit] = useState<MerchantDeposit | null>(null);
  const [myProductsFromDb, setMyProductsFromDb] = useState<Product[]>([]);
  const [, setLoadingApp] = useState(true);

  // Application form inputs
  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [portfolioInput, setPortfolioInput] = useState('');
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);

  // Action status
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Activation token manual input
  const [activationTokenInput, setActivationTokenInput] = useState('');

  // Product modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Load merchant application, deposit and products from Supabase.
  useEffect(() => {
    if (!currentUser || !supabase) { setLoadingApp(false); return; }
    let active = true;
    const load = async () => {
      try {
        const { data: sessionData } = await supabase!.auth.getSession();
        const response = await fetch('/api/merchant/portal-data', { headers: { Authorization: `Bearer ${sessionData.session?.access_token || ''}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Could not load merchant data');
        if (!active) return;
        const row = data.application;
        setMyApplication(row ? { id: row.id, uid: row.user_id, fullName: row.full_name || '', phone: row.phone || '', businessDescription: row.business_description || '', portfolioUrls: row.portfolio_urls || [], status: row.status, submittedAt: row.created_at, reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at, rejectionReason: row.review_note, licensePaid: Boolean(row.license_paid), licensePaidAt: row.license_paid_at } as MerchantApplication : null);
        setMyProductsFromDb((data.products || []).map((p: any) => ({ id: p.id, name: p.title, nameEn: p.title_en || p.title, description: p.description || '', price: Number(p.price), category: p.category || 'development', tags: p.metadata?.tags || [], thumbnail: p.image_url || '', images: p.image_urls || [], status: p.status === 'pending' ? 'pending_review' : p.status, downloadsCount: Number(p.downloads_count || 0), rating: Number(p.rating || 0), ratingCount: Number(p.rating_count || 0), updatedAt: p.updated_at, createdAt: p.created_at, features: p.features || [], featuresEn: p.features_en || [], sellerId: p.seller_id, sellerName: p.seller_name, rejectionReason: p.rejection_reason })) as Product[]);
        const deposit = data.deposit;
        setMyDeposit(deposit ? { uid: deposit.user_id, amount: Number(deposit.amount), status: deposit.status === 'approved' ? 'held' : deposit.status === 'rejected' ? 'forfeited' : 'held', heldAt: deposit.created_at, refundableAt: deposit.refundable_at || deposit.created_at, refundedAt: deposit.refunded_at } as MerchantDeposit : null);
      } catch (error) { console.error('Supabase merchant portal load failed:', error); }
      finally { if (active) setLoadingApp(false); }
    };
    void load();
    return () => { active = false; };
  }, [currentUser?.id]);

  const userBalance = currentUser ? getUserBalance(currentUser.id) : 0;
  const isMerchant = currentUser?.role === 'merchant';
  const myProducts = [...products.filter((p) => p.sellerId === currentUser?.id), ...myProductsFromDb.filter((p) => !products.some((existing) => existing.id === p.id))];

  // Add Portfolio Url
  const handleAddPortfolioUrl = () => {
    if (!portfolioInput.trim()) return;
    if (portfolioUrls.length >= 5) return;
    setPortfolioUrls((prev) => [...prev, portfolioInput.trim()]);
    setPortfolioInput('');
  };

  const handleRemovePortfolioUrl = (idx: number) => {
    setPortfolioUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // Section 1: Submit Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg(null);
    if (!currentUser) return;

    if (fullName.trim().length < 3) {
      setActionMsg({ type: 'error', text: isAr ? 'الاسم يجب أن يكون 3 أحرف على الأقل.' : 'Name too short.' });
      return;
    }
    if (!/^\+?\d{8,15}$/.test(phone.trim())) {
      setActionMsg({ type: 'error', text: isAr ? 'يرجى إدخال رقم هاتف صحيح بالأرقام الدولية.' : 'Invalid phone number.' });
      return;
    }
    if (businessDescription.trim().length < 20) {
      setActionMsg({ type: 'error', text: isAr ? 'وصف النشاط يجب ألا يقل عن 20 حرفاً.' : 'Description too short.' });
      return;
    }

    setActionLoading(true);
    try {
      const { data: sessionData } = await supabase?.auth.getSession() || { data: { session: null } };
      const response = await fetch('/api/merchant/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }, body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim(), businessDescription: businessDescription.trim(), portfolioUrls }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'تعذر تقديم الطلب.');

      setActionMsg({
        type: 'success',
        text: isAr ? 'تم تقديم طلبك بنجاح! سيتم مراجعته من قبل الإدارة.' : 'Application submitted successfully!',
      });
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل تقديم الطلب.' : 'Submission failed.'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Section 2: Pay License Fee + Deposit (Atomic 27 Coins)
  const handlePayFee = async () => {
    setActionMsg({ type: 'error', text: isAr ? 'دفع رسوم التاجر متوقف مؤقتاً حتى ربطه بعملية محاسبية ذرية واختبار استرداد الضمان.' : 'Merchant fee payment is paused until its atomic ledger and deposit-refund flow is implemented and tested.' });
  };

  // Section 3: Send a short-lived, single-use activation token after approval and ledger-confirmed fees.
  const handleSendActivationLink = async () => {
    setActionLoading(true); setActionMsg(null);
    try {
      const { data: sessionData } = await supabase?.auth.getSession() || { data: { session: null } };
      const response = await fetch('/api/merchant/request-activation', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }, body: JSON.stringify({}) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'تعذر إرسال رمز التفعيل.');
      setActionMsg({ type: 'success', text: isAr ? 'تم إرسال رمز تفعيل مؤقت إلى بريد حسابك. الصلاحية 30 دقيقة ويُستخدم مرة واحدة.' : 'A temporary activation token was emailed to your account. It expires in 30 minutes and works once.' });
    } catch (error: any) { setActionMsg({ type: 'error', text: error?.message || (isAr ? 'تعذر إرسال رمز التفعيل.' : 'Could not send activation token.') }); }
    finally { setActionLoading(false); }
  };

  // Section 3b: Verify Activation on the server; never grant merchant role in the browser.
  const handleVerifyActivation = async () => {
    setActionLoading(true); setActionMsg(null);
    try {
      const { data: sessionData } = await supabase?.auth.getSession() || { data: { session: null } };
      const response = await fetch('/api/merchant/verify-activation', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }, body: JSON.stringify({ token: activationTokenInput.trim() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'تعذر التحقق من رمز التفعيل.');
      setActivationTokenInput('');
      await refreshCurrentUser();
      setActionMsg({ type: 'success', text: isAr ? `تم تفعيل حساب التاجر بنجاح. رقم الترخيص: ${result.licenseId}` : `Merchant account activated. License: ${result.licenseId}` });
    } catch (error: any) { setActionMsg({ type: 'error', text: error?.message || (isAr ? 'تعذر التحقق من رمز التفعيل.' : 'Could not verify activation token.') }); }
    finally { setActionLoading(false); }
  };

  // Section 4 & 5: Submit / Update Product
  const handleSaveProduct = async (productData: {
    title: string;
    description: string;
    price: number;
    category: Product['category'];
    images: string[];
    tags: string[];
  }) => {
    setActionMsg(null);
    setActionLoading(true);
    try {
      const { data: sessionData } = await supabase?.auth.getSession() || { data: { session: null } };
      const response = await fetch('/api/merchant/products', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }, body: JSON.stringify({ product: { id: editingProduct?.id, title: productData.title, description: productData.description, price: productData.price, category: productData.category, images: productData.images, tags: productData.tags } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'تعذر حفظ المنتج.');
      if (editingProduct) {
        setActionMsg({
          type: 'success',
          text: isAr
            ? 'تم تعديل المنتج وعاد تلقائياً إلى طابور المراجعة لضمان النزاهة.'
            : 'Product updated and moved to review queue.',
        });
      } else {
        setActionMsg({
          type: 'success',
          text: isAr
            ? 'تم رفع المنتج بنجاح وأُرسل لطابور المراجعة الإدارية.'
            : 'Product submitted for review.',
        });
      }

      setShowAddProductModal(false);
      setEditingProduct(null);
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: err?.message || 'Failed to submit product',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setShowAddProductModal(true);
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Alert / Messages */}
      {actionMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Suspended Pending Review Warning */}
      {currentUser.status === 'suspended_pending_review' && (
        <MerchantSuspendedAlert isAr={isAr} />
      )}

      {/* CASE A: USER IS AN ACTIVATED MERCHANT */}
      {isMerchant ? (
        <div className="space-y-8">
          {/* Section 7: Official License Badge with QR */}
          <MerchantBadgeCard merchant={currentUser} isAr={isAr} />

          {/* Held Deposit Status Card */}
          <MerchantDepositCard isAr={isAr} myDeposit={myDeposit} />

          {/* Section 4 & 5: Merchant Dashboard & Products Management */}
          <MerchantProductsGrid
            myProducts={myProducts}
            isAr={isAr}
            onOpenAddProduct={() => {
              setEditingProduct(null);
              setShowAddProductModal(true);
            }}
            onOpenEditProduct={openEditProduct}
          />
        </div>
      ) : (
        /* CASE B: USER IS NOT YET A MERCHANT */
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1c1611] via-[#12161d] to-[#0c0e12] border-2 border-[#c5a059]/40 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30 flex items-center justify-center mx-auto shadow-lg">
              <Store className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {isAr ? 'بوابة التجار والترخيص الرقمي' : 'Merchant Portal & Verification'}
              </h2>
              <p className="text-xs text-white/60 max-w-lg mx-auto leading-relaxed">
                {isAr
                  ? 'انضم إلى شبكة التجار المعتمدين واعرض منتجاتك الرقمية. نظام معتمد على الدفتر المحاسبي المزدوج مع شارة رسمية مشفرة بـ QR للتحقق اللحظي.'
                  : 'Join our trusted merchant network. Full double-entry ledger integration with verifiable cryptographic QR badges.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs text-white/80 max-w-xl mx-auto">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[#c5a059] font-bold block">1. تقديم الطلب</span>
                <span className="text-[10px] text-white/50">{isAr ? 'مراجعة يدوية من الإدارة' : 'Manual verification'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[#c5a059] font-bold block">2. الرسوم والضمان</span>
                <span className="text-[10px] text-white/50">{isAr ? '2 Coin رسوم + 25 ضمان' : '2 Fee + 25 Deposit'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[#c5a059] font-bold block">3. الشارة والبيع</span>
                <span className="text-[10px] text-white/50">{isAr ? 'تفعيل فوري ووثيقة QR' : 'QR Badge & Instant Sales'}</span>
              </div>
            </div>
          </div>

          {/* Sub-State: Application status (pending, rejected, approved) */}
          {myApplication ? (
            <MerchantApplicationStatus
              isAr={isAr}
              application={myApplication}
              userBalance={userBalance}
              actionLoading={actionLoading}
              activationTokenInput={activationTokenInput}
              setActivationTokenInput={setActivationTokenInput}
              onPayFee={handlePayFee}
              onSendActivationLink={handleSendActivationLink}
              onVerifyActivation={handleVerifyActivation}
              onResetApplication={() => setMyApplication(null)}
              onNavigateToWallet={onNavigateToWallet}
            />
          ) : (
            /* Sub-State: No application submitted yet -> Show Form */
            <MerchantApplicationForm
              isAr={isAr}
              actionLoading={actionLoading}
              fullName={fullName}
              setFullName={setFullName}
              phone={phone}
              setPhone={setPhone}
              businessDescription={businessDescription}
              setBusinessDescription={setBusinessDescription}
              portfolioInput={portfolioInput}
              setPortfolioInput={setPortfolioInput}
              portfolioUrls={portfolioUrls}
              onAddPortfolioUrl={handleAddPortfolioUrl}
              onRemovePortfolioUrl={handleRemovePortfolioUrl}
              onSubmit={handleSubmitApplication}
            />
          )}
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {showAddProductModal && (
        <MerchantProductModal
          isAr={isAr}
          editingProduct={editingProduct}
          actionLoading={actionLoading}
          onClose={() => {
            setShowAddProductModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
};
