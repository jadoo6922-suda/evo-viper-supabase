import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Language, NotificationItem } from '../types';
import { supabase } from '../lib/supabase';

export interface UIContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  hasSeenIntro: boolean;
  setHasSeenIntro: (seen: boolean) => void;
  replayIntro: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: NotificationItem) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('ds_lang') as Language) || 'ar';
  });

  const [hasSeenIntro, setHasSeenIntroState] = useState<boolean>(() => {
    return localStorage.getItem('ds_has_seen_intro') === 'true';
  });

  const [activeTab, setActiveTabState] = useState<string>('store');

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Synchronize HTML attributes for language & text direction
  useEffect(() => {
    localStorage.setItem('ds_lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Notifications are account-scoped in Supabase, not browser-local mock data.
  useEffect(() => {
    if (!supabase) { setNotifications([]); return; }
    let active = true;
    const load = async (token: string) => {
      try {
        const response = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json().catch(() => ({}));
        if (active && response.ok && Array.isArray(result.notifications)) setNotifications(result.notifications);
      } catch (error) { console.warn('Notification sync failed:', error); }
    };
    void supabase.auth.getSession().then(({ data }) => { if (active && data.session) void load(data.session.access_token); else if (active) setNotifications([]); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setNotifications([]); return; }
      void load(session.access_token);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const setHasSeenIntro = useCallback((seen: boolean) => {
    localStorage.setItem('ds_has_seen_intro', seen ? 'true' : 'false');
    setHasSeenIntroState(seen);
  }, []);

  const replayIntro = useCallback(() => {
    setHasSeenIntroState(false);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (supabase && /^[0-9a-f-]{36}$/i.test(id)) void supabase.auth.getSession().then(({ data }) => fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } }));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (supabase) void supabase.auth.getSession().then(({ data }) => fetch('/api/notifications/read-all', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } }));
  }, []);

  const addNotification = useCallback((notif: NotificationItem) => {
    const persistedId = crypto.randomUUID();
    const item = { ...notif, id: persistedId };
    setNotifications((prev) => [item, ...prev.filter((n) => n.id !== persistedId)].slice(0, 200));
    if (supabase) void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      return fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ ...item, body: item.message, bodyEn: item.messageEn, linkTab: item.linkTab }) });
    }).catch((error) => console.warn('Could not persist notification:', error));
  }, []);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      hasSeenIntro,
      setHasSeenIntro,
      replayIntro,
      activeTab,
      setActiveTab,
      notifications,
      unreadNotificationsCount,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      addNotification,
    }),
    [
      language,
      setLanguage,
      toggleLanguage,
      hasSeenIntro,
      setHasSeenIntro,
      replayIntro,
      activeTab,
      setActiveTab,
      notifications,
      unreadNotificationsCount,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      addNotification,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error('useUI must be used within UIProvider');
  }
  return ctx;
}
