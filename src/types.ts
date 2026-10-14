export type Role = 'super_admin' | 'admin' | 'merchant' | 'support' | 'moderator' | 'finance' | 'product_manager' | 'customer';

export type Language = 'ar' | 'en';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  balance?: number;
  walletFrozen?: boolean;
  role: Role;
  status: 'active' | 'suspended' | 'banned' | 'suspended_pending_review';
  createdAt: string;
  securityStatus: 'secure' | 'needs_attention';
  transferCode?: string;
  transferCodeExpiresAt?: number;
  /** @deprecated Stored securely as PBKDF2 hash in securityProfiles/{uid} */
  transferPin?: string;
  hasPinSet?: boolean;
  avatarUrl?: string;
  mfaEnabled?: boolean;
  merchantActivatedAt?: string;
  merchantLicenseId?: string;
  merchantLicenseRevokedAt?: string;
  merchantLicenseRevokeReason?: string;
  verifiedSeller?: boolean;
  referralCode?: string;
  referredBy?: string;
  referralPending?: boolean;
  telegramChatId?: string;
  telegramUsername?: string;
  telegramLinkedAt?: string;
}

export interface MerchantApplication {
  id: string;
  uid: string;
  fullName: string;
  phone: string;
  businessDescription: string;
  portfolioUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  licensePaid?: boolean;
  licensePaidAt?: string | null;
}

export interface MerchantDeposit {
  uid: string;
  amount: number;
  status: 'held' | 'refunded' | 'forfeited';
  heldAt: string;
  refundableAt: string;
  refundedAt?: string;
  forfeitedAt?: string;
}

export interface MerchantReport {
  id: string;
  merchantId: string;
  merchantName?: string;
  reporterId: string;
  reporterName?: string;
  reason: string;
  evidence?: string | null;
  status: 'pending_review' | 'upheld' | 'dismissed';
  createdAt: string;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
}

export interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  title?: string;
  description: string;
  descriptionEn?: string;
  price: number; // in Coins (1 Coin = 1 USD)
  category: 'development' | 'design' | 'security' | 'ai' | 'finance';
  tags: string[];
  thumbnail: string;
  images: string[];
  demoVideoUrl?: string;
  demoUrl?: string;
  fileFormat?: string;
  downloadUrl?: string;
  fileName?: string;
  fileData?: string;
  fileStoragePath?: string;
  fileType?: string;
  fileSize?: string;
  version?: string;
  changelog?: string;
  compatibility?: string;
  terms?: string;
  status: 'published' | 'draft' | 'archived' | 'pending_review' | 'rejected' | 'unpublished';
  downloadsCount: number;
  rating: number;
  ratingCount: number;
  updatedAt: string;
  createdAt?: string;
  features: string[];
  featuresEn?: string[];
  sellerId?: string;
  sellerName?: string;
  rejectionReason?: string;
}

export type TransactionType = 'purchase' | 'transfer_sent' | 'transfer_received' | 'top_up' | 'refund' | 'admin_adjustment';
export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded';

export interface LedgerEntry {
  id: string;
  transactionId: string;
  userId: string;
  type: 'debit' | 'credit';
  amount: number;
  currency: 'COIN';
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  senderId?: string;
  senderName?: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
  description: string;
  productId?: string;
  orderId?: string;
  transferCode?: string;
  riskScore?: 'low' | 'medium' | 'high';
  securityVerificationHash: string;
}

export interface Order {
  id: string;
  userId: string;
  userName?: string;
  sellerId?: string;
  productId: string;
  productName: string;
  productThumbnail?: string;
  price: number;
  status: 'paid' | 'processing' | 'delivered' | 'failed' | 'refunded' | 'completed' | 'escrow_held' | 'escrow_disputed';
  useEscrow?: boolean;
  disputeId?: string;
  disputedAt?: string;
  disputeResolvedAt?: string;
  disputeDecision?: string;
  licenseKey?: string;
  reviewed?: boolean;
  rating?: number;
  escrowReleasedAt?: string;
  autoReleased?: boolean;
  createdAt: string;
  transactionId: string;
  downloadUrl?: string;
  downloadUrlExpiresAt?: number;
  downloadsCount?: number;
  maxDownloads?: number;
}

export interface Review {
  id: string;
  orderId: string;
  productId?: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SellerStats {
  sellerId: string;
  totalRating: number;
  reviewCount: number;
  averageRating: number;
  updatedAt: string;
}

export interface SupportTicketMessage {
  from: 'user' | 'admin';
  text: string;
  timestamp: string;
  authorName?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string;
  subject: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  messages: SupportTicketMessage[];
  status: 'open' | 'answered' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export type DisputeStatus = 'open' | 'under_review' | 'waiting_user' | 'waiting_seller' | 'resolved' | 'rejected' | 'refunded' | 'closed';

export interface Dispute {
  id: string;
  transactionId: string;
  reporterId: string;
  reporterName: string;
  respondentId: string;
  respondentName: string;
  amount: number;
  reason: 'not_received' | 'different_from_desc' | 'transfer_missing' | 'unauthorized' | 'other';
  reasonLabel: string;
  description: string;
  evidenceFiles: {
    id: string;
    name: string;
    url: string;
    size: string;
    uploadedAt: string;
  }[];
  ocrVerification?: {
    extractedAmount?: number;
    extractedDate?: string;
    extractedRef?: string;
    matchStatus: 'match' | 'partial_match' | 'mismatch' | 'suspicious' | 'manual_review';
    confidence: number;
    notes: string;
  };
  status: DisputeStatus;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  type: 'purchase' | 'transfer' | 'dispute' | 'security' | 'system' | 'refund';
  isRead: boolean;
  timestamp: string;
  linkTab?: string;
}

export interface AuditLogItem {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  target: string;
  result: 'success' | 'warning' | 'denied';
  timestamp: string;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface EmergencySettings {
  pausePurchases: boolean;
  pauseTransfers: boolean;
  pauseWallet: boolean;
  pauseRegistrations: boolean;
  maintenanceMode: boolean;
}
