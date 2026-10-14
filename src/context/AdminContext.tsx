import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditEvent } from '../lib/auditLog';
import { AuditLogItem, EmergencySettings, Dispute, DisputeStatus } from '../types';
import { INITIAL_EMERGENCY_SETTINGS } from '../data/mockStore';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';
import { useUI } from './UIContext';

export interface AdminContextType {
  auditLogs: AuditLogItem[];
  emergencySettings: EmergencySettings;
  disputes: Dispute[];
  openDispute: (params: { transactionId: string; reason: Dispute['reason']; reasonLabel: string; description: string; evidenceFiles?: Dispute['evidenceFiles']; ocrVerification?: Dispute['ocrVerification'] }) => Promise<{ success: boolean; message: string; dispute?: Dispute }>;
  adminUpdateDispute: (disputeId: string, status: DisputeStatus, notes?: string, refundUser?: boolean) => Promise<{ success: boolean; message?: string }>;
  adminAdjustWallet: (targetUserId: string, amount: number, type: 'credit' | 'debit', reason: string) => Promise<{ success: boolean; message: string }>;
  adminAdjustUserBalance: (userId: string, amount: number, reason: string) => Promise<{ success: boolean; message: string }>;
  adminUpdateUserStatus: (targetUserId: string, status: 'active' | 'suspended' | 'banned') => Promise<{ success: boolean; message?: string }>;
  adminSetUserStatus: (userId: string, status: 'active' | 'suspended' | 'banned') => Promise<{ success: boolean; message?: string }>;
  adminForceLogoutUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
  updateEmergencySettings: (settings: Partial<EmergencySettings>) => Promise<{ success: boolean; message?: string }>;
  toggleEmergencySetting: (key: keyof EmergencySettings) => Promise<{ success: boolean; message?: string }>;
  refundOrder: (orderId: string) => { success: boolean; message?: string };
  resolveDispute: (disputeId: string, decision: string) => Promise<{ success: boolean; message?: string }>;
  reviewMerchantApplication: (appId: string, decision: string, rejectionReason?: string) => Promise<{ success: boolean; message?: string }>;
  resolveMerchantReport: (reportId: string, decision: string) => Promise<{ success: boolean; message?: string }>;
  adminRevokeMerchantLicense: (merchantId: string, reason?: string) => Promise<{ success: boolean; message?: string }>;
  getAdminDashboardStats: () => Promise<any>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

async function apiRequest(path: string, body?: Record<string, unknown>, method = 'POST') {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in first.');
  const response = await fetch(path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false || result.error) throw new Error(result.message || result.error || 'Request failed.');
  return result;
}

function mapDispute(row: any): Dispute {
  const statusMap: Record<string, DisputeStatus> = { open: 'open', under_review: 'under_review', resolved_buyer: 'resolved', resolved_seller: 'resolved', closed: 'closed' };
  return { id: row.id, transactionId: row.transaction_id || '', reporterId: row.opened_by || row.buyer_id || '', reporterName: row.reporter_name || '', respondentId: row.seller_id || row.buyer_id || '', respondentName: row.respondent_name || '', amount: Number(row.amount || 0), reason: row.reason || 'other', reasonLabel: row.reason_label || row.reason || '', description: row.description || '', evidenceFiles: row.evidence_files || [], ocrVerification: row.ocr_verification || undefined, status: statusMap[row.status] || 'open', createdAt: row.created_at, updatedAt: row.updated_at, adminNotes: row.resolution || undefined } as Dispute;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { currentUser, refreshUsers } = useAuth();
  const { transactions } = useWallet();
  const { language, addNotification } = useUI();
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [emergencySettings, setEmergencySettings] = useState<EmergencySettings>(INITIAL_EMERGENCY_SETTINGS);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  const refreshCoreData = useCallback(async () => {
    if (!currentUser || !['admin', 'super_admin', 'finance', 'product_manager', 'support', 'moderator'].includes(currentUser.role)) return;
    try {
      const result = await apiRequest('/api/admin/core-data', undefined, 'GET');
      setAuditLogs((result.logs || []).map((row: any) => ({ id: String(row.id), actorEmail: row.actor_email || '', actorRole: row.actor_role || 'customer', action: row.action, target: row.entity_id || row.entity_type || 'system', result: row.result || 'success', timestamp: row.created_at, ip: row.ip_address || undefined, metadata: row.details || row.metadata || {} })));
      setDisputes((result.disputes || []).map(mapDispute));
      setEmergencySettings({ ...INITIAL_EMERGENCY_SETTINGS, ...(result.emergencySettings || {}) });
    } catch (error) { console.warn('Admin core data unavailable:', error); }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    void refreshCoreData();
    const refreshOnSettlement = () => void refreshCoreData();
    window.addEventListener('supabase-disputes-updated', refreshOnSettlement);
    return () => window.removeEventListener('supabase-disputes-updated', refreshOnSettlement);
  }, [refreshCoreData]);

  const openDispute = useCallback(async (params: { transactionId: string; reason: Dispute['reason']; reasonLabel: string; description: string; evidenceFiles?: Dispute['evidenceFiles']; ocrVerification?: Dispute['ocrVerification'] }) => {
    const tx = transactions.find((item) => item.id === params.transactionId);
    if (!currentUser || !tx) return { success: false, message: language === 'ar' ? 'المعاملة غير موجودة أو سجّل الدخول.' : 'Transaction not found or not signed in.' };
    try {
      const result = await apiRequest('/api/disputes', { ...params });
      const dispute = mapDispute(result.dispute);
      setDisputes((prev) => [dispute, ...prev.filter((item) => item.id !== dispute.id)]);
      addNotification({ id: `NOT-${dispute.id}`, userId: currentUser.id, title: `تم فتح النزاع #${dispute.id}`, titleEn: `Dispute opened #${dispute.id}`, message: `تم تسجيل النزاع للمعاملة #${tx.id}.`, messageEn: `Dispute filed for transaction #${tx.id}.`, type: 'dispute', isRead: false, timestamp: dispute.createdAt, linkTab: 'disputes' });
      logAuditEvent('DISPUTE_OPENED', { disputeId: dispute.id, transactionId: tx.id, reason: params.reason });
      return { success: true, message: language === 'ar' ? `تم فتح النزاع #${dispute.id} وإرساله للمراجعة.` : `Dispute #${dispute.id} submitted for review.`, dispute };
    } catch (error: any) { return { success: false, message: error?.message || (language === 'ar' ? 'تعذر فتح النزاع.' : 'Could not open dispute.') }; }
  }, [currentUser, transactions, language, addNotification]);

  const adminUpdateDispute = useCallback(async (disputeId: string, status: DisputeStatus, notes?: string, refundUser = false) => {
    if (refundUser || status === 'refunded') return { success: false, message: language === 'ar' ? 'الاسترداد المالي متوقف حتى إكمال واختبار دالة التسوية الذرية.' : 'Refunds are disabled until the atomic settlement function is implemented and tested.' };
    try {
      await apiRequest('/api/admin/disputes/resolve', { disputeId, status, notes });
      setDisputes((prev) => prev.map((d) => d.id === disputeId ? { ...d, status, updatedAt: new Date().toISOString(), adminNotes: notes || d.adminNotes } : d));
      logAuditEvent('DISPUTE_STATUS_CHANGE', { disputeId, status });
      return { success: true };
    } catch (error: any) { return { success: false, message: error?.message || 'Could not update dispute.' }; }
  }, [language]);

  const adminAdjustWallet = useCallback(async (targetUserId: string, amount: number, type: 'credit' | 'debit', reason: string) => {
    if (!Number.isFinite(amount) || amount <= 0 || !reason.trim()) return { success: false, message: language === 'ar' ? 'أدخل مبلغاً موجباً وسبباً واضحاً.' : 'Enter a positive amount and audit reason.' };
    try {
      const storageKey = `ds_admin_wallet_pending_${currentUser?.id || 'admin'}`;
      const signature = `${targetUserId}|${amount.toFixed(2)}|${type}|${reason.trim()}`;
      let clientRequestId = crypto.randomUUID();
      try {
        const prior = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        if (prior && prior.signature === signature && Date.now() - Number(prior.createdAt || 0) < 10 * 60 * 1000) clientRequestId = prior.requestId;
        else sessionStorage.setItem(storageKey, JSON.stringify({ signature, requestId: clientRequestId, createdAt: Date.now() }));
      } catch { /* Database idempotency still protects a reused request key. */ }
      await apiRequest('/api/admin/wallet-adjust', { targetUserId, amount, type, reason: reason.trim(), clientRequestId });
      try { const prior = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); if (prior?.requestId === clientRequestId) sessionStorage.removeItem(storageKey); } catch { /* no-op */ }
      await refreshUsers();
      logAuditEvent(`WALLET_ADJUST_${type.toUpperCase()}`, { targetUserId, amount, type, reason });
      return { success: true, message: language === 'ar' ? 'تم تنفيذ تعديل الرصيد على الخادم.' : 'Wallet adjustment committed on the server.' };
    } catch (error: any) { return { success: false, message: error?.message || 'Wallet adjustment failed.' }; }
  }, [language, refreshUsers, currentUser?.id]);

  const adminAdjustUserBalance = useCallback((userId: string, amount: number, reason: string) => adminAdjustWallet(userId, Math.abs(amount), amount >= 0 ? 'credit' : 'debit', reason), [adminAdjustWallet]);

  const adminUpdateUserStatus = useCallback(async (targetUserId: string, status: 'active' | 'suspended' | 'banned') => {
    try { await apiRequest('/api/admin/user-status', { targetUserId, status }); await refreshUsers(); logAuditEvent('USER_STATUS_CHANGE', { targetUserId, status }); return { success: true }; }
    catch (error: any) { return { success: false, message: error?.message || 'Could not update account status.' }; }
  }, [refreshUsers]);
  const adminSetUserStatus = useCallback((userId: string, status: 'active' | 'suspended' | 'banned') => adminUpdateUserStatus(userId, status), [adminUpdateUserStatus]);
  const adminForceLogoutUser = useCallback(async (userId: string) => { try { await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}/revoke-sessions`, {}); logAuditEvent('USER_SESSIONS_REVOKED', { targetUserId: userId }); return { success: true, message: language === 'ar' ? 'تم إبطال الجلسات السابقة. سيُطلب من المستخدم تسجيل الدخول مجدداً عند الطلب التالي.' : 'Previous sessions were revoked; the user must sign in again on their next protected request.' }; } catch (error: any) { return { success: false, message: error?.message || (language === 'ar' ? 'تعذر إبطال الجلسات.' : 'Could not revoke sessions.') }; } }, [language]);

  const updateEmergencySettings = useCallback(async (settings: Partial<EmergencySettings>) => {
    try { const result = await apiRequest('/api/admin/emergency-settings', { settings }); setEmergencySettings({ ...emergencySettings, ...(result.settings || settings) }); logAuditEvent('EMERGENCY_SETTINGS_CHANGE', settings); return { success: true }; }
    catch (error: any) { return { success: false, message: error?.message || 'Could not update emergency settings.' }; }
  }, [emergencySettings]);
  const toggleEmergencySetting = useCallback((key: keyof EmergencySettings) => updateEmergencySettings({ [key]: !emergencySettings[key] }), [emergencySettings, updateEmergencySettings]);

  const refundOrder = useCallback((_orderId: string) => ({ success: false, message: language === 'ar' ? 'استرداد الطلب متوقف حتى ربطه بدالة محاسبية ذرية.' : 'Order refunds are disabled until connected to an atomic ledger function.' }), [language]);
  const resolveDispute = useCallback(async (disputeId: string, decision: string) => {
    if (decision === 'refund_buyer' || decision === 'release_seller') return { success: false, message: language === 'ar' ? 'قرار النزاع المالي متوقف حتى إكمال واختبار التسوية الذرية؛ لم يتم تحويل أي رصيد.' : 'Financial settlement is disabled until the atomic settlement function is tested; no funds were moved.' };
    const result = await adminUpdateDispute(disputeId, 'closed', decision);
    return { success: result.success, message: result.message };
  }, [adminUpdateDispute, language]);
  const reviewMerchantApplication = useCallback(async (appId: string, decision: string, rejectionReason?: string) => {
    try { await apiRequest('/api/admin/merchant-manager/action', { action: 'review_application', id: appId, decision, reason: rejectionReason }); return { success: true }; }
    catch (error: any) { return { success: false, message: error?.message }; }
  }, []);
  const resolveMerchantReport = useCallback(async (reportId: string, decision: string) => {
    try { await apiRequest('/api/admin/merchant-manager/action', { action: 'resolve_report', id: reportId, decision }); return { success: true }; }
    catch (error: any) { return { success: false, message: error?.message }; }
  }, []);
  const adminRevokeMerchantLicense = useCallback(async (merchantId: string, reason?: string) => {
    try { await apiRequest('/api/admin/merchant-manager/action', { action: 'revoke_license', id: merchantId, reason: reason || 'Revoked by administrator' }); return { success: true }; }
    catch (error: any) { return { success: false, message: error?.message }; }
  }, []);
  const getAdminDashboardStats = useCallback(async () => {
    try { return await apiRequest('/api/admin/dashboard-stats', undefined, 'GET'); }
    catch (error) { console.warn('Admin stats unavailable:', error); return null; }
  }, []);

  const value = useMemo(() => ({ auditLogs, emergencySettings, disputes, openDispute, adminUpdateDispute, adminAdjustWallet, adminAdjustUserBalance, adminUpdateUserStatus, adminSetUserStatus, adminForceLogoutUser, updateEmergencySettings, toggleEmergencySetting, refundOrder, resolveDispute, reviewMerchantApplication, resolveMerchantReport, adminRevokeMerchantLicense, getAdminDashboardStats }), [auditLogs, emergencySettings, disputes, openDispute, adminUpdateDispute, adminAdjustWallet, adminAdjustUserBalance, adminUpdateUserStatus, adminSetUserStatus, adminForceLogoutUser, updateEmergencySettings, toggleEmergencySetting, refundOrder, resolveDispute, reviewMerchantApplication, resolveMerchantReport, adminRevokeMerchantLicense, getAdminDashboardStats]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() { const ctx = useContext(AdminContext); if (!ctx) throw new Error('useAdmin must be used within AdminProvider'); return ctx; }
