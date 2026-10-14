import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../context/StoreContext';
import {
  MerchantApplication,
  MerchantDeposit,
  MerchantReport,
  Product,
} from '../../types';
import { ApplicationsTab } from './merchants/ApplicationsTab';
import { DepositsTab } from './merchants/DepositsTab';
import { AccountsTab } from './merchants/AccountsTab';
import { ProductsReviewTab } from './merchants/ProductsReviewTab';
import { ReportsTab } from './merchants/ReportsTab';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  UserCheck,
  Eye,
} from 'lucide-react';

export const AdminMerchantsManager: React.FC = () => {
  const { language, users } = useStore();
  const isAr = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<
    'applications' | 'deposits' | 'accounts' | 'products' | 'reports'
  >('applications');

  // Admin queue loaded from Supabase server routes
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [deposits, setDeposits] = useState<MerchantDeposit[]>([]);
  const [reports, setReports] = useState<MerchantReport[]>([]);
  const [merchantProducts, setMerchantProducts] = useState<Product[]>([]);
  const [, setLoading] = useState(true);

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Load the administration queue through the role-checked Supabase server endpoint.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await supabase?.auth.getSession() || { data: { session: null } };
        const response = await fetch('/api/admin/merchant-manager', { headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'Not authorized');
        if (!active) return;
        setApplications((result.applications || []).map((row: any) => ({ id: row.id, uid: row.user_id, fullName: row.full_name || '', phone: row.phone || '', businessDescription: row.business_description || '', portfolioUrls: row.portfolio_urls || [], status: row.status, submittedAt: row.created_at, reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at, rejectionReason: row.review_note, licensePaid: Boolean(row.license_paid), licensePaidAt: row.license_paid_at })));
        setDeposits((result.deposits || []).map((row: any) => ({ uid: row.user_id, amount: Number(row.amount), status: row.status === 'approved' ? 'held' : row.status === 'rejected' ? 'forfeited' : 'held', heldAt: row.created_at, refundableAt: row.refundable_at || row.created_at, refundedAt: row.refunded_at })));
        setReports((result.reports || []).map((row: any) => ({ id: row.id, merchantId: row.merchant_id, merchantName: row.merchant_name, reporterId: row.reporter_id, reporterName: row.reporter_name, reason: row.description || row.reason, evidence: row.evidence, status: row.status === 'open' || row.status === 'reviewing' ? 'pending_review' : row.status === 'resolved' ? 'upheld' : 'dismissed', createdAt: row.created_at, resolvedBy: row.resolved_by, resolvedAt: row.resolved_at })));
        setMerchantProducts((result.products || []).map((row: any) => ({ id: row.id, name: row.title, nameEn: row.title_en || row.title, description: row.description || '', price: Number(row.price), category: row.category || 'development', tags: row.metadata?.tags || [], thumbnail: row.image_url || '', images: row.image_urls || [], status: row.status === 'pending' ? 'pending_review' : row.status, downloadsCount: Number(row.downloads_count || 0), rating: Number(row.rating || 0), ratingCount: Number(row.rating_count || 0), updatedAt: row.updated_at, createdAt: row.created_at, features: row.features || [], featuresEn: row.features_en || [], sellerId: row.seller_id, sellerName: row.seller_name, rejectionReason: row.rejection_reason })));
      } catch (error) { console.error('Supabase merchant admin queue failed:', error); }
      finally { if (active) setLoading(false); }
    };
    const refreshHandler = () => void load();
    window.addEventListener('admin-merchant-data-changed', refreshHandler);
    void load();
    return () => { active = false; window.removeEventListener('admin-merchant-data-changed', refreshHandler); };
  }, [users.length]);

  const performAction = async (payload: Record<string, unknown>) => {
    const { data } = await supabase?.auth.getSession() || { data: { session: null } };
    const response = await fetch('/api/admin/merchant-manager/action', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || 'تعذر تنفيذ الإجراء.');
    return result;
  };

  const flashSuccess = (msg: string) => {
    window.dispatchEvent(new Event('admin-merchant-data-changed'));
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const flashError = (msg: string) => {
    setActionErrorMsg(msg);
    setTimeout(() => setActionErrorMsg(null), 5000);
  };

  // Server-side, role-checked merchant administration actions.
  const handleReviewApplication = async (applicationId: string, decision: 'approved' | 'rejected', reason?: string) => {
    setProcessingId(applicationId); setActionErrorMsg(null);
    try { await performAction({ action: 'review_application', id: applicationId, decision, reason }); flashSuccess(decision === 'approved' ? (isAr ? 'تمت الموافقة على الطلب.' : 'Application approved.') : (isAr ? 'تم رفض الطلب.' : 'Application rejected.')); }
    catch (err: any) { flashError(err?.message || 'Failed to review application'); }
    finally { setProcessingId(null); }
  };

  const handleReviewProduct = async (productId: string, decision: 'published' | 'rejected' | 'unpublished', reason?: string) => {
    setProcessingId(productId); setActionErrorMsg(null);
    try { await performAction({ action: 'review_product', id: productId, decision, reason }); flashSuccess(decision === 'published' ? (isAr ? 'تم نشر المنتج.' : 'Product published.') : decision === 'rejected' ? (isAr ? 'تم رفض المنتج.' : 'Product rejected.') : (isAr ? 'تم إلغاء نشر المنتج.' : 'Product unpublished.')); }
    catch (err: any) { flashError(err?.message || 'Error reviewing product'); }
    finally { setProcessingId(null); }
  };

  const handleResolveReport = async (reportId: string, decision: 'upheld' | 'dismissed') => {
    setProcessingId(reportId); setActionErrorMsg(null);
    try { await performAction({ action: 'resolve_report', id: reportId, decision }); flashSuccess(decision === 'upheld' ? (isAr ? 'تم تأييد البلاغ وتعليق الحساب للمراجعة.' : 'Report upheld and account suspended for review.') : (isAr ? 'تم إغلاق البلاغ دون إجراء.' : 'Report dismissed.')); }
    catch (err: any) { flashError(err?.message || 'Error resolving report'); }
    finally { setProcessingId(null); }
  };

  const handleResendActivation = async (targetUid: string) => {
    setProcessingId(targetUid);
    try { await performAction({ action: 'send_activation', id: targetUid }); flashSuccess(isAr ? 'تم طلب إرسال رابط التفعيل.' : 'Activation link requested.'); }
    catch (err: any) { flashError(err?.message || 'Activation email is not configured.'); }
    finally { setProcessingId(null); }
  };

  const handleRevokeLicense = async (merchantId: string) => {
    const reason = prompt(isAr ? 'أدخل سبب إلغاء الترخيص:' : 'Enter revocation reason:');
    if (!reason) return;
    setProcessingId(merchantId);
    try { await performAction({ action: 'revoke_license', id: merchantId, reason }); flashSuccess(isAr ? 'تم إلغاء الترخيص وتعليق الحساب.' : 'License revoked and account suspended.'); }
    catch (err: any) { flashError(err?.message || 'Failed to revoke license'); }
    finally { setProcessingId(null); }
  };

  const handleRegenerateQR = async (merchantId: string) => {
    setProcessingId(merchantId);
    try { const result = await performAction({ action: 'regenerate_license', id: merchantId }); flashSuccess(isAr ? `تم إنشاء رقم ترخيص جديد: ${result.licenseId}` : `New license ID: ${result.licenseId}`); }
    catch (err: any) { flashError(err?.message || 'Failed to regenerate license'); }
    finally { setProcessingId(null); }
  };

  const handleTriggerDepositRefund = async () => {
    setProcessingId('deposit_refund');
    try { await performAction({ action: 'refund_deposits' }); flashSuccess(isAr ? 'اكتملت معالجة الضمانات.' : 'Deposit refund process completed.'); }
    catch (err: any) { flashError(err?.message || 'Refund service is not ready.'); }
    finally { setProcessingId(null); }
  };

  // Calculate high level metrics
  const totalPaidFees = applications.filter((a) => a.licensePaid).length * 2;
  const heldDepositsCount = deposits.filter((d) => d.status === 'held').length;
  const totalHeldAmount = heldDepositsCount * 25;
  const pendingAppsCount = applications.filter((a) => a.status === 'pending').length;
  const pendingProductsCount = merchantProducts.filter((p) => p.status === 'pending_review').length;
  const pendingReportsCount = reports.filter((r) => r.status === 'pending_review').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-[#12161d] to-[#0c0e12] border border-white/10 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c5a059] to-[#8f6d2b] p-0.5 flex items-center justify-center shadow-lg shadow-[#c5a059]/20">
            <div className="w-full h-full bg-[#12161d] rounded-[14px] flex items-center justify-center text-[#c5a059]">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#c5a059]">
                Enterprise Authority
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white/60">
                Ledger Backed
              </span>
            </div>
            <h2 className="text-xl font-black text-white">
              {isAr ? 'نظام إدارة التجار والتراخيص الرقمية' : 'Merchant & License Management'}
            </h2>
          </div>
        </div>

        {/* Global Action Banners / Feedback */}
        {actionSuccessMsg && (
          <div className="p-3 px-4 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
        {actionErrorMsg && (
          <div className="p-3 px-4 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#12161d] border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-white/40 block">
            {isAr ? 'طلبات بانتظار المراجعة' : 'Pending Applications'}
          </span>
          <div className="text-2xl font-black text-amber-400">{pendingAppsCount}</div>
          <span className="text-[10px] text-white/40">{isAr ? 'تتطلب قرار الإدارة' : 'Awaiting review'}</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#12161d] border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-white/40 block">
            {isAr ? 'رسوم التراخيص المحصلة' : 'Collected License Fees'}
          </span>
          <div className="text-2xl font-black text-[#c5a059]">{totalPaidFees} Coins</div>
          <span className="text-[10px] text-emerald-400 font-medium">ADMIN-RESERVE</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#12161d] border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-white/40 block">
            {isAr ? 'أموال الضمان المحجوزة' : 'Security Deposits Held'}
          </span>
          <div className="text-2xl font-black text-white">{totalHeldAmount} Coins</div>
          <span className="text-[10px] text-white/40 font-mono">{heldDepositsCount} {isAr ? 'تاجر مؤمّن (+30 يوم)' : 'active bonds'}</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#12161d] border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-white/40 block">
            {isAr ? 'طابور فحص المنتجات' : 'Products in Review'}
          </span>
          <div className="text-2xl font-black text-rose-400">{pendingProductsCount}</div>
          <span className="text-[10px] text-white/40">{isAr ? 'مرفوعة من التجار' : 'Pending merchant items'}</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#12161d] border border-white/10">
        <button
          onClick={() => setActiveSubTab('applications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'applications'
              ? 'bg-[#c5a059] text-black shadow-md shadow-[#c5a059]/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isAr ? 'طلبات التجار' : 'Applications'}</span>
          {pendingAppsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {pendingAppsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('deposits')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'deposits'
              ? 'bg-[#c5a059] text-black shadow-md shadow-[#c5a059]/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{isAr ? 'الضمانات والرسوم' : 'Deposits & Fees'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'accounts'
              ? 'bg-[#c5a059] text-black shadow-md shadow-[#c5a059]/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{isAr ? 'حالة التفعيل والتراخيص' : 'Accounts & Licenses'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'products'
              ? 'bg-[#c5a059] text-black shadow-md shadow-[#c5a059]/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>{isAr ? 'طابور مراجعة المنتجات' : 'Product Review'}</span>
          {pendingProductsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-black">
              {pendingProductsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'reports'
              ? 'bg-[#c5a059] text-black shadow-md shadow-[#c5a059]/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{isAr ? 'بلاغات التجار' : 'Reports'}</span>
          {pendingReportsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {pendingReportsCount}
            </span>
          )}
        </button>
      </div>

      {/* Sub-Tabs Content */}
      {activeSubTab === 'applications' && (
        <ApplicationsTab
          applications={applications}
          isAr={isAr}
          processingId={processingId}
          onReviewApplication={handleReviewApplication}
        />
      )}

      {activeSubTab === 'deposits' && (
        <DepositsTab
          deposits={deposits}
          users={users}
          isAr={isAr}
          processingId={processingId}
          onTriggerDepositRefund={handleTriggerDepositRefund}
        />
      )}

      {activeSubTab === 'accounts' && (
        <AccountsTab
          users={users}
          applications={applications}
          isAr={isAr}
          processingId={processingId}
          onResendActivation={handleResendActivation}
          onRegenerateQR={handleRegenerateQR}
          onRevokeLicense={handleRevokeLicense}
        />
      )}

      {activeSubTab === 'products' && (
        <ProductsReviewTab
          products={merchantProducts}
          isAr={isAr}
          processingId={processingId}
          onReviewProduct={handleReviewProduct}
        />
      )}

      {activeSubTab === 'reports' && (
        <ReportsTab
          reports={reports}
          isAr={isAr}
          processingId={processingId}
          onResolveReport={handleResolveReport}
        />
      )}
    </div>
  );
};
