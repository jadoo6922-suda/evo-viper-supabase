import React, { useEffect, useState } from 'react';
import {
  FileText,
  Coins,
  Fingerprint,
  Archive,
  PlusCircle,
  Sliders,
  Users,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Lock,
  LogOut,
  RefreshCw,
  Eye,
  Wallet,
  ShoppingBag,
  PackageCheck,
  AlertTriangle,
  History,
  Store,
  Scale,
  Flag,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AdminTransferRecords } from '../components/admin/AdminTransferRecords';
import { AdminGiveCoins } from '../components/admin/AdminGiveCoins';
import { ReceiptForensicScanner } from '../components/admin/ReceiptForensicScanner';
import { AdminProductUpload } from '../components/admin/AdminProductUpload';
import { AdminArchiveView } from '../components/admin/AdminArchiveView';
import { AdminMerchantsManager } from '../components/admin/AdminMerchantsManager';
import { supabase } from '../lib/supabase';

export const AdminDashboardView: React.FC = () => {
  const {
    currentUser,
    users,
    setUserRole,
    products,
    transactions,
    orders,
    ledgerEntries,
    disputes,
    auditLogs,
    emergencySettings,
    toggleEmergencySetting,
    adminAdjustUserBalance,
    adminSetUserStatus,
    adminForceLogoutUser,
    getUserBalance,
    escrowThreshold,
    updateEscrowThreshold,
    resolveEscrowDispute,
    adminUpdateDispute,
    getAdminDashboardStats,
    language,
  } = useStore();

  const isAr = language === 'ar';

  const [currentTab, setCurrentTab] = useState<
    'records' | 'give_coins' | 'forensic' | 'archive' | 'upload_product' | 'merchants' | 'overview' | 'users' | 'emergency' | 'disputes' | 'reports'
  >('records');

  // User search in users tab
  const [userSearch, setUserSearch] = useState('');
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({});
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);
  const [sessionRevokeBusyId, setSessionRevokeBusyId] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [merchantReports, setMerchantReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportActionId, setReportActionId] = useState<string | null>(null);
  useEffect(() => { let active = true; void getAdminDashboardStats().then((stats) => { if (active && stats) setDashboardStats(stats); }); return () => { active = false; }; }, [currentUser?.id, getAdminDashboardStats]);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canManageUsers = ['super_admin', 'admin', 'moderator'].includes(currentUser?.role || '');
  const canManageWallet = ['super_admin', 'admin', 'finance'].includes(currentUser?.role || '');
  const canManageProducts = ['super_admin', 'admin', 'product_manager'].includes(currentUser?.role || '');
  const canManageDisputes = ['super_admin', 'admin', 'support', 'moderator'].includes(currentUser?.role || '');
  const canManageEmergency = ['super_admin', 'admin'].includes(currentUser?.role || '');
  const canManageMerchants = ['super_admin', 'admin'].includes(currentUser?.role || '');
  const canManageReports = ['super_admin', 'admin', 'moderator'].includes(currentUser?.role || '');
  const allowedTabs = [
    ...(canManageWallet ? ['records', 'give_coins', 'forensic'] : []),
    ...(canManageProducts ? ['archive', 'upload_product'] : []),
    ...(canManageMerchants ? ['merchants'] : []),
    ...(canManageUsers ? ['users'] : []),
    ...(canManageEmergency ? ['emergency'] : []),
    'overview',
    ...(canManageDisputes ? ['disputes'] : []),
    ...(canManageReports ? ['reports'] : []),
  ];
  useEffect(() => { if (!allowedTabs.includes(currentTab)) setCurrentTab(allowedTabs[0] as any); }, [currentUser?.role]);
  useEffect(() => {
    if (!canManageReports || !supabase) return;
    let active = true;
    setReportsLoading(true);
    void supabase.auth.getSession().then(async ({ data }) => {
      const response = await fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } });
      const result = await response.json().catch(() => ({}));
      if (active && response.ok && Array.isArray(result.reports)) setMerchantReports(result.reports);
    }).catch(() => undefined).finally(() => { if (active) setReportsLoading(false); });
    return () => { active = false; };
  }, [currentUser?.id, currentUser?.role, canManageReports]);

  // Escrow Admin Configuration state
  const [escrowThresholdInput, setEscrowThresholdInput] = useState<string>('');
  const [thresholdLoading, setThresholdLoading] = useState(false);
  const [thresholdMsg, setThresholdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);

  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(escrowThresholdInput);
    if (isNaN(val) || val <= 0) {
      setThresholdMsg({
        type: 'error',
        text: isAr ? 'يرجى إدخال قيمة رقمية صالحة للحد الأدنى.' : 'Please enter a valid positive number.',
      });
      return;
    }

    setThresholdLoading(true);
    setThresholdMsg(null);
    try {
      const res = await updateEscrowThreshold(val);
      if (res.success) {
        setThresholdMsg({
          type: 'success',
          text: isAr
            ? `تم تحديث الحد الأدنى لنظام الضمان (Escrow) بنجاح إلى ${val} Coins.`
            : `Escrow threshold updated successfully to ${val} Coins.`,
        });
        setEscrowThresholdInput('');
        setTimeout(() => setThresholdMsg(null), 4000);
      } else {
        setThresholdMsg({
          type: 'error',
          text: res.message || (isAr ? 'فشل التحديث' : 'Failed to update threshold'),
        });
      }
    } finally {
      setThresholdLoading(false);
    }
  };

  const handleResolveDispute = async (disputeId: string, decision: 'refund_buyer' | 'release_seller') => {
    setResolvingDisputeId(disputeId);
    try {
      const result = await resolveEscrowDispute(disputeId, decision);
      if (!result.success) window.alert(result.message || (isAr ? 'لم يتم تسوية النزاع المالي.' : 'Financial dispute was not settled.'));
    } finally {
      setResolvingDisputeId(null);
    }
  };

  const handleDisputeStatusChange = async (disputeId: string, status: 'under_review' | 'closed', notes: string) => {
    const result = await adminUpdateDispute(disputeId, status, notes);
    if (!result.success) window.alert(result.message || (isAr ? 'تعذر تحديث حالة النزاع.' : 'Could not update dispute status.'));
  };

  const handleResolveReport = async (reportId: string, decision: 'upheld' | 'dismissed') => {
    if (!supabase) return;
    setReportActionId(reportId);
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/reports/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ reportId, decision }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) { window.alert(result.message || (isAr ? 'تعذر حفظ قرار البلاغ.' : 'Could not resolve report.')); return; }
      setMerchantReports((prev) => prev.map((report) => report.id === reportId ? { ...report, status: result.result?.status || (decision === 'upheld' ? 'resolved' : 'dismissed'), resolution_note: decision === 'upheld' && currentUser?.role === 'moderator' ? (isAr ? 'رُفع للمدير للمراجعة' : 'Escalated for admin review') : decision === 'upheld' && isAr ? 'تم تأكيد البلاغ' : decision === 'upheld' ? 'Report upheld' : 'Report dismissed' } : report));
    } finally { setReportActionId(null); }
  };

  const handleRoleChange = async (userId: string) => {
    const selectedRole = roleSelections[userId];
    if (!selectedRole || !isSuperAdmin) return;
    setRoleBusyId(userId);
    try {
      const result = await setUserRole(userId, selectedRole as 'customer' | 'admin' | 'support' | 'moderator' | 'finance' | 'product_manager');
      if (!result.success) window.alert(result.message || (isAr ? 'تعذر تغيير الدور.' : 'Could not update role.'));
      else window.dispatchEvent(new Event('admin-roles-updated'));
    } finally { setRoleBusyId(null); }
  };

  const handleRevokeSessions = async (userId: string) => {
    if (!isSuperAdmin || !window.confirm(isAr ? 'سيتم إبطال جلسات هذا الحساب السابقة، وسيحتاج إلى تسجيل الدخول مجدداً. هل تريد المتابعة؟' : 'This revokes the account’s previous sessions. The user will need to sign in again. Continue?')) return;
    setSessionRevokeBusyId(userId);
    try {
      const result = await adminForceLogoutUser(userId);
      window.alert(result.message || (result.success ? (isAr ? 'تم إبطال الجلسات.' : 'Sessions revoked.') : (isAr ? 'تعذر إبطال الجلسات.' : 'Could not revoke sessions.')));
    } finally { setSessionRevokeBusyId(null); }
  };

  const disputedEscrowOrders = orders.filter((o) => o.status === 'escrow_disputed');

  // Overview metrics
  const totalUsers = Number(dashboardStats?.users ?? users.length);
  const activeUsers = Number(dashboardStats?.activeUsers ?? users.filter((u) => u.status === 'active').length);
  const circulatingCoins = dashboardStats?.circulatingCoins == null ? null : Number(dashboardStats.circulatingCoins);
  const totalTransfers = Number(dashboardStats?.transactions ?? transactions.length);
  const pendingDisputes = disputes.filter(
    (d) => d.status === 'open' || d.status === 'under_review'
  ).length;

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.id.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6 pb-20" id="admin-dashboard-container">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#801428] text-white border border-[#c5a059]/40 tracking-wider uppercase">
              ADMIN STORE COMMAND
            </span>
            <span className="text-xs font-mono text-[#c5a059]">{currentUser?.email || 'ADMIN'}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            {isAr ? 'لوحة الإدارة المركزية والتحكم المالي' : 'Central Admin & Ledger Command'}
          </h1>
          <p className="text-xs text-white/50">
            {isAr
              ? 'سجلات التحويل، منح الكوينز، فحص البصمة الرقمية للصور، الأرشيف الشامل، وإضافة المنتجات'
              : 'Transfer logs, coin grants, AI forensic verification, system archive, and product catalog'}
          </p>
        </div>

        {/* Operational indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/80 font-medium">
            {isAr ? 'نظام التحقق الذاتي نشط' : 'Ledger Core Operational'}
          </span>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
        {[
          { id: 'records', name: '1. سجلات التحويلات', nameEn: '1. Transfer Records', icon: FileText },
          { id: 'give_coins', name: '2. إعطاء كوينز', nameEn: '2. Give Coins', icon: Coins },
          { id: 'forensic', name: '3. فحص صورة التحويل', nameEn: '3. Forensic Verify', icon: Fingerprint },
          { id: 'archive', name: '4. أرشيف شامل', nameEn: '4. Full Archive', icon: Archive },
          { id: 'upload_product', name: '5. إضافة منتج', nameEn: '5. Add Product', icon: PlusCircle },
          { id: 'merchants', name: '6. نظام التجار والتراخيص', nameEn: '6. Merchants & Licenses', icon: Store },
          { id: 'overview', name: 'نظرة عامة', nameEn: 'Overview', icon: Sliders },
          { id: 'users', name: 'المستخدمين', nameEn: 'Users', icon: Users },
          { id: 'emergency', name: 'الطوارئ', nameEn: 'Emergency', icon: ShieldAlert },
          { id: 'disputes', name: 'النزاعات', nameEn: 'Disputes', icon: Scale },
          { id: 'reports', name: 'البلاغات', nameEn: 'Reports', icon: Flag },
        ].filter((tab) => allowedTabs.includes(tab.id)).map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#801428] via-[#a31a33] to-[#801428] text-white border border-[#c5a059]/50 shadow-md shadow-[#801428]/30'
                  : 'bg-[#12161d] text-white/60 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#c5a059]' : ''}`} />
              <span>{isAr ? tab.name : tab.nameEn}</span>
              {tab.id === 'forensic' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: TRANSFER RECORDS */}
      {currentTab === 'records' && canManageWallet && <AdminTransferRecords />}

      {/* SECTION 2: GIVE COINS */}
      {currentTab === 'give_coins' && canManageWallet && <AdminGiveCoins />}

      {/* SECTION 3: FORENSIC RECEIPT VERIFICATION */}
      {currentTab === 'forensic' && canManageWallet && <ReceiptForensicScanner />}

      {/* SECTION 4: COMPREHENSIVE ARCHIVE */}
      {currentTab === 'archive' && canManageProducts && <AdminArchiveView />}

      {/* SECTION 5: ADD / UPLOAD PRODUCT */}
      {currentTab === 'upload_product' && canManageProducts && <AdminProductUpload />}

      {/* SECTION 6: OVERVIEW & ANALYTICS */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#12161d] border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/40 block">
                {isAr ? 'إجمالي المستخدمين' : 'Total Users'}
              </span>
              <div className="text-2xl font-black text-white">{totalUsers}</div>
              <span className="text-[10px] text-emerald-400 font-medium">
                {activeUsers} {isAr ? 'حساب نشط' : 'active accounts'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#12161d] border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/40 block">
                {isAr ? 'إجمالي أرصدة المحافظ' : 'Total Wallet Balances'}
              </span>
              <div className="text-2xl font-black text-amber-400">{circulatingCoins == null ? '—' : circulatingCoins.toLocaleString()}</div>
              <span className="text-[10px] text-white/40 font-mono">{isAr ? 'حسب الأرصدة الحالية في قاعدة البيانات' : 'Based on current wallet balances'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#12161d] border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/40 block">
                {isAr ? 'إجمالي المعاملات' : 'Total Transactions'}
              </span>
              <div className="text-2xl font-black text-white">{totalTransfers}</div>
              <span className="text-[10px] text-white/40 font-medium">{isAr ? 'يشمل التحويلات والمشتريات والتسويات' : 'Transfers, purchases and settlements'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#12161d] border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/40 block">
                {isAr ? 'المنتجات الرقمية المنشورة' : 'Published Products'}
              </span>
              <div className="text-2xl font-black text-[#c5a059]">{Number(dashboardStats?.products ?? products.length)}</div>
              <span className="text-[10px] text-white/40">{isAr ? 'جاهزة للتنزيل الفوري' : 'Instant digital delivery'}</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: USERS MANAGEMENT */}
      {currentTab === 'users' && canManageUsers && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-white/40 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم، الإيميل، أو المعرف...' : 'Search users...'}
                className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2.5 rounded-xl bg-[#12161d] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
              />
            </div>
            <span className="text-xs text-white/40 font-mono">{filteredUsers.length} {isAr ? 'مستخدم مسجل' : 'users'}</span>
          </div>

          <div className="rounded-2xl bg-[#12161d] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">{isAr ? 'المستخدم' : 'User'}</th>
                    <th className="p-4">{isAr ? 'البريد الإلكتروني' : 'Email'}</th>
                    <th className="p-4">{isAr ? 'الدور' : 'Role'}</th>
                    <th className="p-4">{isAr ? 'الرصيد' : 'Balance'}</th>
                    <th className="p-4">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-4 text-center">{isAr ? 'إجراءات الإدارة' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => {
                    const bal = getUserBalance(u.id);
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="p-4">
                          <div className="font-bold text-white">{u.displayName}</div>
                          <div className="text-[10px] font-mono text-white/40">{u.id}</div>
                        </td>
                        <td className="p-4 font-mono text-white/80">{u.email}</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'super_admin'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-white/5 text-white/60'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 font-black text-amber-400">{bal} Coins</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {isSuperAdmin && !['super_admin', 'merchant'].includes(u.role) && <>
                              <select aria-label={isAr ? 'الدور الجديد' : 'New role'} value={roleSelections[u.id] || (u.role === 'customer' ? 'customer' : u.role)} onChange={(e) => setRoleSelections((prev) => ({ ...prev, [u.id]: e.target.value }))} className="max-w-36 rounded-lg bg-black/40 border border-white/10 px-2 py-1.5 text-[10px] text-white">
                                {[['customer', isAr ? 'عميل' : 'Customer'], ['support', isAr ? 'الدعم' : 'Support'], ['moderator', isAr ? 'مشرف' : 'Moderator'], ['finance', isAr ? 'مالي' : 'Finance'], ['product_manager', isAr ? 'مدير منتجات' : 'Product Manager'], ['admin', isAr ? 'مدير' : 'Admin']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                              <button type="button" disabled={roleBusyId === u.id || (roleSelections[u.id] || (u.role === 'customer' ? 'customer' : u.role)) === (u.role === 'customer' ? 'customer' : u.role)} onClick={() => void handleRoleChange(u.id)} className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-400/20 text-[10px] disabled:opacity-40">{roleBusyId === u.id ? '…' : (isAr ? 'حفظ الدور' : 'Save role')}</button>
                            </>}
                            {isSuperAdmin && u.role !== 'super_admin' && <button type="button" disabled={sessionRevokeBusyId === u.id} onClick={() => void handleRevokeSessions(u.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-300 disabled:opacity-40"><LogOut className="h-3 w-3" />{sessionRevokeBusyId === u.id ? '…' : (isAr ? 'إبطال الجلسات' : 'Revoke sessions')}</button>}
                            {canManageUsers && u.role !== 'super_admin' && (u.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => adminSetUserStatus(u.id, 'suspended')}
                                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 cursor-pointer"
                              >
                                {isAr ? 'تعليق' : 'Suspend'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => adminSetUserStatus(u.id, 'active')}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 cursor-pointer"
                              >
                                {isAr ? 'تنشيط' : 'Activate'}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff dispute queue: non-financial status changes only; financial settlement remains server-disabled. */}
      {currentTab === 'disputes' && canManageDisputes && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-[#12161d] p-4"><h3 className="font-bold text-white">{isAr ? 'مراجعة النزاعات' : 'Dispute review queue'}</h3><p className="mt-1 text-xs text-white/50">{isAr ? 'يمكن تحديث حالة المراجعة فقط. لا يتم تحويل الأموال أو ردها من هذه الشاشة.' : 'Only review statuses can be changed here. No money is moved or refunded from this screen.'}</p></div>
          {disputes.length === 0 ? <p className="p-6 text-center text-sm text-white/50">{isAr ? 'لا توجد نزاعات حالياً.' : 'No disputes currently.'}</p> : disputes.map((dispute) => <div key={dispute.id} className="rounded-xl border border-white/10 bg-[#12161d] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><p className="text-sm font-bold text-white">#{dispute.id.slice(0, 8)} · {dispute.reasonLabel || dispute.reason}</p><p className="mt-1 text-xs text-white/50">{dispute.description}</p><p className="mt-1 text-[10px] text-white/40">{new Date(dispute.createdAt).toLocaleString()}</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/70">{dispute.status}</span>{['open','under_review'].includes(dispute.status) && <><button type="button" onClick={() => void handleDisputeStatusChange(dispute.id, 'under_review', 'Assigned for review')} className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{isAr ? 'قيد المراجعة' : 'Under review'}</button><button type="button" onClick={() => void handleDisputeStatusChange(dispute.id, 'closed', 'Closed without financial settlement')} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">{isAr ? 'إغلاق دون تسوية مالية' : 'Close (no settlement)'}</button></>}</div></div>)}
        </div>
      )}

      {/* MERCHANT REPORT REVIEW — moderators can decide report status, but cannot suspend merchants. */}
      {currentTab === 'reports' && canManageReports && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-[#12161d] p-4"><h3 className="font-bold text-white">{isAr ? 'مراجعة بلاغات التجار' : 'Merchant report review'}</h3><p className="mt-1 text-xs text-white/50">{isAr ? (['admin','super_admin'].includes(currentUser?.role || '') ? 'تأكيد البلاغ قد يؤدي إلى تعليق حساب التاجر وإلغاء ترخيصه.' : 'يمكنك رفض البلاغ أو رفعه للمدير للمراجعة؛ العقوبات على حساب التاجر محصورة بالمديرين.') : (['admin','super_admin'].includes(currentUser?.role || '') ? 'Upholding a report can suspend the merchant and revoke the license.' : 'You can dismiss or escalate a report; merchant sanctions are restricted to admins.')}</p></div>
          {reportsLoading ? <p className="p-6 text-center text-white/50 text-sm">{isAr ? 'جارٍ تحميل البلاغات…' : 'Loading reports…'}</p> : merchantReports.length === 0 ? <p className="p-6 text-center text-white/50 text-sm">{isAr ? 'لا توجد بلاغات.' : 'No reports found.'}</p> : merchantReports.map((report) => <div key={report.id} className="rounded-xl border border-white/10 bg-[#12161d] p-4 space-y-3"><div className="flex flex-col md:flex-row md:items-start justify-between gap-2"><div><p className="text-sm font-bold text-white">{report.merchant_name || report.merchant_id} · {report.reason}</p><p className="mt-1 text-xs text-white/50">{report.description || ''}</p><p className="mt-1 text-[10px] text-white/40">{isAr ? 'مقدّم البلاغ:' : 'Reported by:'} {report.reporter_name || report.reporter_id} · {new Date(report.created_at).toLocaleString()}</p>{report.evidence && <p className="mt-2 text-xs text-sky-300 break-all">{isAr ? 'الأدلة:' : 'Evidence:'} {report.evidence}</p>}{currentUser?.role === 'moderator' && report.status === 'reviewing' && <p className="mt-2 text-xs text-amber-300">{isAr ? 'تم رفع البلاغ؛ بانتظار قرار المدير.' : 'Escalated; awaiting admin decision.'}</p>}</div><span className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white/70 self-start">{report.status}</span></div>{(['admin','super_admin'].includes(currentUser?.role || '') ? ['open','reviewing'].includes(report.status) : report.status === 'open') && <div className="flex flex-wrap gap-2"><button type="button" disabled={reportActionId === report.id} onClick={() => void handleResolveReport(report.id, 'upheld')} className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 disabled:opacity-50">{reportActionId === report.id ? '…' : isAr ? (['admin','super_admin'].includes(currentUser?.role || '') ? 'تأكيد البلاغ واتخاذ إجراء' : 'رفع للمدير') : (['admin','super_admin'].includes(currentUser?.role || '') ? 'Uphold and sanction' : 'Escalate to admin')}</button><button type="button" disabled={reportActionId === report.id} onClick={() => void handleResolveReport(report.id, 'dismissed')} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 disabled:opacity-50">{isAr ? 'رفض البلاغ' : 'Dismiss report'}</button></div>}</div>)}
        </div>
      )}

      {/* SECTION 8: EMERGENCY CONTROLS */}
      {currentTab === 'emergency' && canManageEmergency && (
        <div className="p-6 rounded-2xl bg-[#12161d] border border-rose-500/30 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isAr ? 'مفاتيح الطوارئ والدرع السيبراني' : 'Emergency Security & Kill-Switches'}
              </h3>
              <p className="text-xs text-white/60">
                {isAr
                  ? 'إيقاف فوري للعمليات المالية والتسجيل في حالات الاشتباه الأمني'
                  : 'Instant kill-switches to halt financial operations or registrations'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">{isAr ? 'إيقاف التحويلات المالية' : 'Halt Transfers'}</span>
                <span className="text-[10px] text-white/40">{isAr ? 'تجميد فوري لجميع التحويلات' : 'Freeze outgoing/incoming transfers'}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleEmergencySetting('pauseTransfers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  emergencySettings.pauseTransfers
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                {emergencySettings.pauseTransfers ? (isAr ? 'مُعطل' : 'Paused') : (isAr ? 'نشط' : 'Active')}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">{isAr ? 'إيقاف المحفظة والشحن' : 'Halt Wallet Top-ups'}</span>
                <span className="text-[10px] text-white/40">{isAr ? 'منع شحن أو تفريغ الأرصدة' : 'Disable balance credit/debit'}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleEmergencySetting('pauseWallet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  emergencySettings.pauseWallet
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                {emergencySettings.pauseWallet ? (isAr ? 'مُعطل' : 'Paused') : (isAr ? 'نشط' : 'Active')}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">{isAr ? 'إيقاف تسجيل الحسابات' : 'Pause Registrations'}</span>
                <span className="text-[10px] text-white/40">{isAr ? 'منع إنشاء مستخدمين جدد' : 'Block new user accounts'}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleEmergencySetting('pauseRegistrations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  emergencySettings.pauseRegistrations
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                {emergencySettings.pauseRegistrations ? (isAr ? 'مُعطل' : 'Paused') : (isAr ? 'نشط' : 'Active')}
              </button>
            </div>
          </div>

          {/* Escrow Platform Threshold Configuration */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#c5a059]" />
                  <span className="text-sm font-bold text-white">
                    {isAr ? 'الحد الأدنى لتفعيل نظام الضمان (Escrow Threshold)' : 'Escrow Protection Threshold'}
                  </span>
                </div>
                <p className="text-[11px] text-white/40">
                  {isAr
                    ? 'المنتجات التي يساوي أو يتجاوز سعرها هذا الحد تُحجز مبالغها في حساب الضمان حتى تأكيد الاستلام أو انقضاء مهلة الفحص.'
                    : 'Purchases meeting or exceeding this threshold are automatically held in ESCROW-RESERVE.'}
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-[#c5a059] font-bold">
                {isAr ? 'الحد الحالي:' : 'Current:'} {escrowThreshold} Coins
              </div>
            </div>

            {thresholdMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  thresholdMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{thresholdMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveThreshold} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="number"
                min="1"
                placeholder={isAr ? `تعديل الحد (مثال: ${escrowThreshold})` : `New threshold (e.g. ${escrowThreshold})`}
                value={escrowThresholdInput}
                onChange={(e) => setEscrowThresholdInput(e.target.value)}
                className="w-full sm:w-64 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#c5a059]"
              />
              <button
                type="submit"
                disabled={thresholdLoading || !escrowThresholdInput}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#801428] to-[#590e1c] border border-[#c5a059]/40 hover:border-[#c5a059] transition-all cursor-pointer disabled:opacity-50"
              >
                {thresholdLoading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الحد الأدنى' : 'Save Threshold')}
              </button>
            </form>
          </div>

          {/* Disputed Escrow Orders Manager */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-white">
                  {isAr ? 'النزاعات المعلّقة على طلبات الضمان (Disputed Escrow Orders)' : 'Arbitration: Disputed Escrow Orders'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  {disputedEscrowOrders.length}
                </span>
              </div>
              <p className="text-[11px] text-white/40">
                {isAr
                  ? 'الطلبات المجمدة بسبب نزاعات المشترين. يمكنك التحكيم المالي بنقل الرصيد من حساب الضمان إلى المشتري أو التاجر.'
                  : 'Frozen orders under dispute. Settle by executing an atomic transfer from ESCROW-RESERVE.'}
              </p>
            </div>

            {disputedEscrowOrders.length === 0 ? (
              <div className="p-6 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-white/40">
                {isAr ? 'لا توجد نزاعات معلقة حالياً على عمليات الضمان.' : 'No active escrow disputes pending arbitration.'}
              </div>
            ) : (
              <div className="space-y-3">
                {disputedEscrowOrders.map((ord) => {
                  const isResolving = resolvingDisputeId === ord.disputeId;
                  return (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl bg-black/40 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#c5a059]">#{ord.id}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {isAr ? 'نزاع نشط' : 'Active Dispute'}
                          </span>
                          {ord.disputeId && (
                            <span className="font-mono text-[10px] text-white/50">ID: {ord.disputeId}</span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white">{ord.productName}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/40 font-mono">
                          <span>{isAr ? 'المشتري:' : 'Buyer:'} {ord.userId}</span>
                          <span>•</span>
                          <span>{isAr ? 'التاجر:' : 'Seller:'} {ord.sellerId || 'N/A'}</span>
                          <span>•</span>
                          <span className="text-[#c5a059] font-bold">{ord.price} Coins</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isResolving}
                          onClick={() => handleResolveDispute(ord.disputeId || ord.id, 'refund_buyer')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isResolving ? '...' : (isAr ? 'استرداد للمشتري' : 'Refund Buyer')}
                        </button>
                        <button
                          type="button"
                          disabled={isResolving}
                          onClick={() => handleResolveDispute(ord.disputeId || ord.id, 'release_seller')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isResolving ? '...' : (isAr ? 'إفراج للتاجر' : 'Release to Seller')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Merchants & Licenses Tab */}
      {currentTab === 'merchants' && canManageMerchants && (
        <AdminMerchantsManager />
      )}
    </div>
  );
};
