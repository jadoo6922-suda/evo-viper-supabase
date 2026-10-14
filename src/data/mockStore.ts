import { Product, User, Transaction, LedgerEntry, Order, Dispute, NotificationItem, AuditLogItem, SessionInfo, EmergencySettings } from '../types';

export const INITIAL_USERS: User[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_LEDGER_ENTRIES: LedgerEntry[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_DISPUTES: Dispute[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];

export const INITIAL_SESSIONS: SessionInfo[] = [];

export const INITIAL_EMERGENCY_SETTINGS: EmergencySettings = {
  pausePurchases: false,
  pauseTransfers: false,
  pauseWallet: false,
  pauseRegistrations: false,
  maintenanceMode: false,
};
