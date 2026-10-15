import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logAuditEvent } from '../lib/auditLog';
import { fetchOwnProfile } from '../lib/serverApi';
import { User, SessionInfo } from '../types';
import { useUI } from './UIContext';

export interface AuthContextType {
  currentUser: User | null;
  users: User[];
  refreshUsers: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  sessions: SessionInfo[];
  login: (emailOrUsername: string, pass: string, pin?: string) => Promise<{ success: boolean; requiresPin?: boolean; hasPinSetup?: boolean; message?: string }>;
  logout: () => void;
  register: (name: string, username: string, email: string, pass?: string, pin?: string) => Promise<{ success: boolean; message?: string }>;
  updateTransferPin: (newPin: string, currentPin?: string) => Promise<{ success: boolean; message?: string }>;
  setUserRole: (targetUid: string, newRole: 'customer' | 'admin' | 'support' | 'moderator' | 'finance' | 'product_manager') => Promise<{ success: boolean; message?: string }>;
  switchUser: (userId: string) => void;
  setCurrentUserDirectly: (user: User | null) => void;
  revokeSession: (sessionId: string) => void;
  logoutAllSessions: () => void;
  linkTelegramAccount: (telegramAuthData: any) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
type ProfileRow = Record<string, any>;

function profileToUser(row: ProfileRow, emailFallback = ''): User {
  const roleMap: Record<string, User['role']> = { user: 'customer', customer: 'customer', merchant: 'merchant', admin: 'admin', super_admin: 'super_admin', support: 'support', moderator: 'moderator', finance: 'finance', product_manager: 'product_manager' };
  const statusMap: Record<string, User['status']> = { active: 'active', suspended: 'suspended', banned: 'banned', closed: 'banned' };
  return {
    id: String(row.id), email: String(row.email || emailFallback || ''), username: String(row.username || ''),
    displayName: String(row.display_name || row.username || 'User'), role: roleMap[row.role] || 'customer',
    status: statusMap[row.account_status] || 'active', createdAt: row.created_at || new Date().toISOString(),
    securityStatus: row.security_status === 'needs_attention' ? 'needs_attention' : 'secure',
    transferCode: undefined, transferCodeExpiresAt: undefined,
    hasPinSet: Boolean(row.has_pin_set), avatarUrl: row.avatar_url || undefined, mfaEnabled: Boolean(row.mfa_enabled),
    merchantActivatedAt: row.merchant_activated_at || undefined, merchantLicenseId: row.merchant_license_id || undefined,
    merchantLicenseRevokedAt: row.merchant_license_revoked_at || undefined, merchantLicenseRevokeReason: row.merchant_license_revoke_reason || undefined,
    verifiedSeller: Boolean(row.verified_seller), referralCode: row.referral_code || undefined, referredBy: row.referred_by || undefined,
    referralPending: Boolean(row.referral_pending), telegramChatId: row.telegram_chat_id || undefined,
    telegramUsername: row.telegram_username || undefined, telegramLinkedAt: row.telegram_linked_at || undefined,
  };
}

async function loadProfile(userId: string, email = ''): Promise<User | null> {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token || sessionData.session.user.id !== userId) return null;
  const data = await fetchOwnProfile();
  return profileToUser(data, email);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { language } = useUI();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [authReady, setAuthReady] = useState(false);

  const refreshUser = useCallback(async (session: Session | null) => {
    if (!session?.user || !supabase) { setCurrentUser(null); setUsers([]); return; }
    try {
      let user = await loadProfile(session.user.id, session.user.email || '');
      if (!user) throw new Error('Profile row is missing. Verify the on_auth_user_created trigger in Supabase.');
      if (user.status === 'banned' || user.status === 'suspended') {
        setCurrentUser(null); setUsers([]);
        await supabase.auth.signOut();
        return;
      }
      if (user) {
        // Admin privileges are never exposed to the app state at AAL1, even before
        // the profile's mfa_enabled flag has been migrated or repaired.
        if (['admin', 'super_admin'].includes(user.role)) {
          const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (assuranceError || assurance?.currentLevel !== 'aal2') { setCurrentUser(null); setUsers([]); return; }
        }
        setCurrentUser(user); setUsers([user]);
        if (['admin', 'super_admin', 'finance', 'product_manager', 'support', 'moderator'].includes(user.role)) {
          const { data: sessionInfo } = await supabase.auth.getSession();
          const adminResponse = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${sessionInfo.session?.access_token || ''}` } });
          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            if (Array.isArray(adminData.users)) setUsers(adminData.users as User[]);
          }
        }
      }
    } catch (error) {
      console.error('[Supabase Auth] Could not load profile:', error);
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) { setAuthReady(true); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) void refreshUser(data.session).finally(() => { if (alive) setAuthReady(true); }); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) void refreshUser(session).finally(() => { if (alive) setAuthReady(true); });
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [refreshUser]);

  const refreshCurrentUser = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await refreshUser(data.session);
  }, [refreshUser]);

  const refreshUsers = useCallback(async () => {
    if (!supabase || !currentUser || !['admin', 'super_admin', 'finance', 'moderator'].includes(currentUser.role)) return;
    const { data } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } });
    if (!response.ok) return;
    const result = await response.json();
    if (Array.isArray(result.users)) setUsers(result.users as User[]);
  }, [currentUser?.id, currentUser?.role]);

  const login = useCallback(async (emailOrUsername: string, pass: string, pin?: string) => {
    if (!supabase) return { success: false, message: language === 'ar' ? 'إعدادات Supabase غير مكتملة.' : 'Supabase is not configured.' };
    const identifier = emailOrUsername.trim().toLowerCase();
    if (!identifier || !pass) return { success: false, message: language === 'ar' ? 'أدخل البريد وكلمة المرور.' : 'Enter email and password.' };
    let authData: any;
    if (!identifier.includes('@')) {
      try {
        const response = await fetch('/api/auth/sign-in-username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: identifier, password: pass }) });
        const result = await response.json();
        if (!response.ok || !result.session?.access_token || !result.session?.refresh_token) return { success: false, message: language === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' : 'Incorrect username or password.' };
        const { data, error } = await supabase.auth.setSession({ access_token: result.session.access_token, refresh_token: result.session.refresh_token });
        if (error || !data.session?.user) {
          return { success: false, message: language === 'ar' ? 'تعذر إنشاء جلسة الدخول.' : 'Could not establish a sign-in session.' };
        }
        // Ensure browser client holds the session before profile fetch.
        const confirmed = await supabase.auth.getSession();
        if (!confirmed.data.session?.access_token) {
          return { success: false, message: language === 'ar' ? 'تعذر تثبيت جلسة الدخول محلياً.' : 'Could not persist the sign-in session locally.' };
        }
        authData = { user: data.session.user, session: confirmed.data.session };
      } catch { return { success: false, message: language === 'ar' ? 'تعذر الاتصال بخدمة تسجيل الدخول.' : 'Could not reach the sign-in service.' }; }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email: identifier, password: pass });
      if (error || !data.user) return { success: false, message: language === 'ar' ? 'البريد أو كلمة المرور غير صحيحة.' : 'Incorrect email or password.' };
      authData = data;
    }
    const data = authData;
    try {
      const profile = await loadProfile(data.user.id, data.user.email || identifier);
      if (profile?.status === 'banned' || profile?.status === 'suspended') {
        await supabase.auth.signOut();
        return { success: false, message: language === 'ar' ? 'الحساب موقوف. تواصل مع الدعم.' : 'This account is suspended.' };
      }
      // Transfer PIN is enforced on every financial transfer, not as a second login password.
      if (profile) { setCurrentUser(profile); setUsers([profile]); logAuditEvent('USER_LOGIN', { email: profile.email, target: profile.id }); }
      return { success: true };
    } catch (e) {
      console.error('[Supabase Auth] Profile validation failed:', e);
      return { success: false, message: language === 'ar' ? 'تعذر تحميل ملف الحساب.' : 'Could not load your account profile.' };
    }
  }, [language]);

  const logout = useCallback(async () => {
    if (currentUser) logAuditEvent('USER_LOGOUT', { email: currentUser.email, target: currentUser.id });
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(null); setUsers([]);
  }, [currentUser]);

  const register = useCallback(async (name: string, username: string, email: string, pass?: string, pin?: string) => {
    if (!supabase) return { success: false, message: language === 'ar' ? 'إعدادات Supabase غير مكتملة.' : 'Supabase is not configured.' };
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPass = pass || '';
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) return { success: false, message: language === 'ar' ? 'اسم المستخدم يجب أن يكون 3-24 حرفاً إنجليزياً أو رقماً أو _.' : 'Username must be 3–24 characters (letters, numbers, underscore).' };
    if (!cleanEmail.includes('@') || cleanPass.length < 8) return { success: false, message: language === 'ar' ? 'أدخل بريداً صالحاً وكلمة مرور من 8 أحرف على الأقل.' : 'Enter a valid email and a password of at least 8 characters.' };
    if (pin && !/^\d{4,6}$/.test(pin)) return { success: false, message: language === 'ar' ? 'PIN يجب أن يكون من 4 إلى 6 أرقام.' : 'PIN must contain 4–6 digits.' };
    try {
      const statusResponse = await fetch('/api/platform-status');
      const platformStatus = await statusResponse.json().catch(() => ({}));
      if (platformStatus.maintenanceMode || platformStatus.pauseRegistrations) return { success: false, message: language === 'ar' ? 'التسجيل متوقف مؤقتاً.' : 'Registration is temporarily paused.' };
    } catch { return { success: false, message: language === 'ar' ? 'تعذر التحقق من حالة التسجيل.' : 'Could not check registration status.' }; }
    const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password: cleanPass, options: { data: { username: cleanUsername, display_name: name.trim() || cleanUsername } } });
    if (error || !data.user) return { success: false, message: error?.message || (language === 'ar' ? 'تعذر إنشاء الحساب.' : 'Could not create account.') };
    if (data.session) {
      if (pin) {
        const pinResult = await fetch('/api/auth/set-transfer-pin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ newPin: pin }) });
        if (!pinResult.ok) return { success: true, message: language === 'ar' ? 'تم إنشاء الحساب، لكن تعيين PIN لم يكتمل؛ عيّنه من إعدادات الحساب.' : 'Account created, but PIN setup did not complete. Set it in account settings.' };
      }
      await refreshUser(data.session);
    }
    return { success: true, message: !data.session && language === 'ar' ? 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الدخول.' : undefined };
  }, [language, refreshUser]);

  const updateTransferPin = useCallback(async (newPin: string, currentPin?: string) => {
    if (!supabase || !currentUser) return { success: false, message: language === 'ar' ? 'سجّل الدخول أولاً.' : 'Please sign in first.' };
    if (!/^\d{4,6}$/.test(newPin)) return { success: false, message: language === 'ar' ? 'PIN يجب أن يكون من 4 إلى 6 أرقام.' : 'PIN must contain 4–6 digits.' };
    const { data } = await supabase.auth.getSession();
    const response = await fetch('/api/auth/set-transfer-pin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ newPin, currentPin }) });
    if (!response.ok) { const body = await response.json().catch(() => ({})); return { success: false, message: body.message || (language === 'ar' ? 'فشل تحديث PIN.' : 'Failed to update PIN.') }; }
    const updated = { ...currentUser, hasPinSet: true }; setCurrentUser(updated); setUsers([updated]);
    return { success: true, message: language === 'ar' ? 'تم تحديث PIN.' : 'PIN updated.' };
  }, [currentUser, language]);

  const setUserRole = useCallback(async (targetUid: string, newRole: 'customer' | 'admin' | 'support' | 'moderator' | 'finance' | 'product_manager') => {
    if (!supabase) return { success: false, message: 'Supabase is not configured.' };
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { success: false, message: language === 'ar' ? 'سجّل الدخول أولاً.' : 'Please sign in first.' };
    const response = await fetch('/api/admin/set-user-role', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetUid, newRole }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return { success: false, message: result.message || (language === 'ar' ? 'تعذر تغيير الصلاحية.' : 'Could not change role.') };
    if (currentUser?.id === targetUid) await refreshUser(data.session);
    await refreshUsers();
    return { success: true };
  }, [language, currentUser?.id, refreshUser, refreshUsers]);
  const switchUser = useCallback((_userId: string) => { /* Impersonation is intentionally disabled for security. */ }, []);
  const setCurrentUserDirectly = useCallback((user: User | null) => { if (!user) { void logout(); return; } if (currentUser?.id === user.id) setCurrentUser(user); else if (supabase) { void supabase.auth.getSession().then(({ data }) => { if (data.session?.user.id === user.id) void refreshUser(data.session); }); } }, [currentUser, logout, refreshUser]);
  const revokeSession = useCallback((_sessionId: string) => { /* Remote session revocation requires the admin API. */ }, []);
  const logoutAllSessions = useCallback(() => { if (supabase) void supabase.auth.signOut({ scope: 'global' }); setCurrentUser(null); setUsers([]); }, []);
  const linkTelegramAccount = useCallback(async (telegramAuthData: any) => {
    if (!supabase) return { success: false, message: 'Supabase is not configured.' };
    const { data } = await supabase.auth.getSession();
    const response = await fetch('/api/auth/link-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ telegramAuthData }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return { success: false, message: result.message || (language === 'ar' ? 'تعذر ربط تيليجرام.' : 'Could not link Telegram.') };
    await refreshCurrentUser();
    return { success: true, message: language === 'ar' ? 'تم التحقق من توقيع تيليجرام وربط الحساب.' : 'Telegram signature verified and account linked.' };
  }, [language, refreshCurrentUser]);

  const value = useMemo(() => ({ currentUser, users, sessions, refreshUsers, refreshCurrentUser, login, logout, register, updateTransferPin, setUserRole, switchUser, setCurrentUserDirectly, revokeSession, logoutAllSessions, linkTelegramAccount }), [currentUser, users, sessions, refreshUsers, refreshCurrentUser, login, logout, register, updateTransferPin, setUserRole, switchUser, setCurrentUserDirectly, revokeSession, logoutAllSessions, linkTelegramAccount]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
