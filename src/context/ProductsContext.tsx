import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { logAuditEvent } from '../lib/auditLog';
import { Product, Order, Transaction, NotificationItem } from '../types';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';
import { useUI } from './UIContext';

export interface ProductsContextType {
  products: Product[];
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  orders: Order[];
  purchaseProduct: (productId: string) => Promise<{ success: boolean; message: string; order?: Order }>;
  downloadProductFile: (orderId: string) => Promise<{ success: boolean; downloadUrl?: string; fileName?: string; message?: string }>; 
  adminSaveProduct: (product: Partial<Product>) => Promise<{ success: boolean; message?: string }>;
  adminArchiveProduct: (productId: string) => Promise<{ success: boolean; message?: string }>;
  adminAddProduct: (prod: Partial<Product>) => Promise<{ success: boolean; message?: string }>; 
  escrowThreshold: number;
  updateEscrowThreshold: (threshold: number) => Promise<{ success: boolean; message?: string }>;
  confirmEscrowDelivery: (orderId: string) => Promise<{ success: boolean; message?: string }>;
  disputeEscrowOrder: (orderId: string, reason: string) => Promise<{ success: boolean; disputeId?: string; message?: string }>;
  resolveEscrowDispute: (disputeId: string, decision: 'refund_buyer' | 'release_seller') => Promise<{ success: boolean; message?: string }>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const { setSelectedReceipt, setTransactions } = useWallet();
  const { language, addNotification } = useUI();

  const [products, setProducts] = useState<Product[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const [escrowThreshold, setEscrowThreshold] = useState<number>(500);

  // Load catalog and the signed-in user's orders from Supabase.
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const load = async () => {
      const [catalogResponse, settingsResult] = await Promise.all([
        fetch('/api/catalog-data', { headers: currentUser ? { Authorization: `Bearer ${(await supabase!.auth.getSession()).data.session?.access_token || ''}` } : {}, cache: 'no-store' }),
        fetch('/api/escrow-threshold').then(async (response) => response.ok ? response.json() : ({ threshold: 500 })).catch(() => ({ threshold: 500 })),
      ]);
      const catalogPayload = await catalogResponse.json().catch(() => ({}));
      if (!active || !catalogResponse.ok) return;
      const productRows = catalogPayload.products || [];
      const orderRows = catalogPayload.orders || [];
      setProducts(productRows.map((row: any) => ({ id: row.id, name: row.title, nameEn: row.title_en || row.title, title: row.title, description: row.description || '', descriptionEn: row.metadata?.description_en || '', price: Number(row.price), category: row.category || 'development', tags: row.metadata?.tags || [], thumbnail: row.image_url || '', images: Array.isArray(row.image_urls) ? row.image_urls : [], demoVideoUrl: row.demo_video_url || undefined, demoUrl: row.demo_url || undefined, fileFormat: row.file_format || undefined, downloadUrl: undefined, fileName: row.file_name || undefined, fileData: undefined, fileStoragePath: undefined, fileType: row.file_type || undefined, fileSize: row.file_size || undefined, version: row.metadata?.version || '1.0', changelog: row.metadata?.changelog || '', compatibility: row.metadata?.compatibility || '', terms: row.metadata?.terms || '', status: row.status === 'pending' ? 'pending_review' : row.status, downloadsCount: Number(row.downloads_count || 0), rating: Number(row.rating || 0), ratingCount: Number(row.rating_count || 0), updatedAt: row.updated_at, createdAt: row.created_at, features: Array.isArray(row.features) ? row.features : [], featuresEn: Array.isArray(row.features_en) ? row.features_en : [], sellerId: row.seller_id || undefined, sellerName: row.seller_name || undefined, rejectionReason: undefined })));
      setOrders(orderRows.map((row: any) => ({ id: row.id, userId: row.user_id, sellerId: row.seller_id || undefined, productId: row.product_id, productName: row.product_name || '', productThumbnail: row.product_thumbnail || undefined, price: Number(row.amount), status: row.escrow_status === 'held' ? 'escrow_held' : row.escrow_status === 'disputed' || row.status === 'disputed' ? 'escrow_disputed' : row.status === 'completed' ? 'completed' : row.status, useEscrow: Boolean(row.use_escrow), disputeId: row.dispute_id || undefined, createdAt: row.created_at, transactionId: row.transaction_id || '', downloadUrl: undefined, downloadUrlExpiresAt: row.download_url_expires_at || undefined, downloadsCount: Number(row.downloads_count || 0), maxDownloads: row.max_downloads || undefined })));
      if (settingsResult?.threshold != null && Number.isFinite(Number(settingsResult.threshold))) setEscrowThreshold(Number(settingsResult.threshold));
    };
    void load();
    const refreshTimer = window.setInterval(() => { void load(); }, 45000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, [currentUser?.id]);

  // Purchase is committed by the server/database RPC; the browser never fabricates a balance, receipt hash, or order.
  const purchaseProduct = useCallback(async (productId: string) => {
    if (!currentUser) return { success: false, message: language === 'ar' ? 'يرجى تسجيل الدخول أولاً.' : 'Please sign in first.' };
    const product = products.find((p) => p.id === productId);
    if (!product || product.status !== 'published') return { success: false, message: language === 'ar' ? 'المنتج غير متوفر للشراء.' : 'Product not available.' };
    const existingOrder = orders.find((o) => o.userId === currentUser.id && o.productId === productId && ['paid', 'completed', 'escrow_held'].includes(o.status));
    if (existingOrder) return { success: false, message: language === 'ar' ? 'لقد قمت بشراء هذا المنتج مسبقاً! يمكنك تحميله من قسم مكتبتي.' : 'You already own this product. Download it from My Library.' };
    if (!supabase) return { success: false, message: 'Supabase is not configured.' };
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) return { success: false, message: language === 'ar' ? 'انتهت جلسة الدخول؛ سجّل الدخول مجدداً.' : 'Your session expired. Please sign in again.' };
    const purchaseResponse = await fetch('/api/products/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` }, body: JSON.stringify({ productId: product.id, clientRequestId: uuidv4() }) });
    const purchaseResult = await purchaseResponse.json().catch(() => ({}));
    if (!purchaseResponse.ok || !purchaseResult.success || !purchaseResult.result) return { success: false, message: purchaseResult.message || (language === 'ar' ? 'رفض الخادم عملية الشراء؛ لم يتم خصم الرصيد.' : 'The server rejected the purchase; no balance was changed.') };
    const orderId = String(purchaseResult.result.orderId);
    const txId = String(purchaseResult.result.txId);
    const receiptResponse = await fetch(`/api/me/purchase-result?orderId=${encodeURIComponent(orderId)}&txId=${encodeURIComponent(txId)}`, { headers: { Authorization: `Bearer ${sessionData.session.access_token}` }, cache: 'no-store' });
    const receiptPayload = await receiptResponse.json().catch(() => ({}));
    if (!receiptResponse.ok || !receiptPayload.order || !receiptPayload.transaction) {
      // The RPC may have committed. Do not claim failure or issue a second charge; refresh state and return its idempotent receipt reference.
      return { success: true, message: language === 'ar' ? `تم تنفيذ الشراء. المرجع: ${purchaseResult.result.reference || txId}. حدّث الصفحة إذا لم يظهر الطلب بعد.` : `Purchase committed. Reference: ${purchaseResult.result.reference || txId}. Refresh if the order does not appear yet.` };
    }
    const row = receiptPayload.order;
    const order: Order = { id: row.id, userId: row.user_id, sellerId: row.seller_id || undefined, productId: row.product_id, productName: row.product_name || product.name, productThumbnail: row.product_thumbnail || product.thumbnail, price: Number(row.amount), status: row.escrow_status === 'held' ? 'escrow_held' : row.escrow_status === 'disputed' || row.status === 'disputed' ? 'escrow_disputed' : row.status, useEscrow: Boolean(row.use_escrow), disputeId: row.dispute_id || undefined, createdAt: row.created_at, transactionId: row.transaction_id || txId, downloadUrl: undefined, downloadUrlExpiresAt: row.download_url_expires_at || undefined, downloadsCount: Number(row.downloads_count || 0), maxDownloads: row.max_downloads || 10 };
    const txRow = receiptPayload.transaction;
    const tx: Transaction = { id: txRow.id, reference: txRow.reference || purchaseResult.result.reference || '', type: 'purchase', senderId: currentUser.id, senderName: currentUser.displayName, receiverId: txRow.counterparty_user_id || undefined, receiverName: product.sellerName || 'Store', amount: Number(txRow.amount), status: txRow.status, timestamp: txRow.created_at, description: txRow.description || `Purchase: ${product.name}`, productId: product.id, orderId: order.id, securityVerificationHash: txRow.security_verification_hash || '' };
    setOrders((prev) => [order, ...prev.filter((item) => item.id !== order.id)]);
    setTransactions((prev) => [tx, ...prev.filter((item) => item.id !== tx.id)]);
    setSelectedReceipt(tx);
    addNotification({ id: `NOT-${order.id}`, userId: currentUser.id, title: 'تم الشراء بنجاح', titleEn: 'Purchase complete', message: `تم شراء "${product.name}" وإضافته إلى مكتبتك.`, messageEn: `"${product.nameEn}" is now available in My Library.`, type: 'purchase', isRead: false, timestamp: order.createdAt, linkTab: 'library' });
    logAuditEvent('PRODUCT_PURCHASE', { orderId: order.id, productId: product.id, price: order.price, reference: tx.reference });
    return { success: true, message: language === 'ar' ? `تم شراء "${product.name}" بنجاح وإضافته إلى مكتبتك الرقمية.` : `Successfully purchased "${product.nameEn}" and added it to your library.`, order };
  }, [currentUser, products, orders, language, addNotification, setTransactions, setSelectedReceipt, setOrders]);

  // Download Product File
  const downloadProductFile = useCallback(async (orderId: string) => {
    if (!currentUser || !supabase) return { success: false, message: language === 'ar' ? 'سجّل الدخول أولاً.' : 'Not logged in.' };
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`/api/products/${encodeURIComponent(orderId)}/download`, { method: 'POST', headers: { Authorization: `Bearer ${sessionData.session?.access_token || ''}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.downloadUrl) return { success: false, message: result.message || (language === 'ar' ? 'تعذر إنشاء رابط تنزيل آمن.' : 'Could not create a secure download link.') };
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, downloadsCount: Number(result.downloadsCount || (order.downloadsCount || 0) + 1), downloadUrl: result.downloadUrl, downloadUrlExpiresAt: result.expiresAt } : order));
    logAuditEvent('SIGNED_DOWNLOAD_GENERATED', { orderId });
    return { success: true, downloadUrl: result.downloadUrl, fileName: result.fileName || `product_${orderId}.zip`, message: language === 'ar' ? 'تم التحقق من ملكية الطلب وإنشاء رابط تنزيل مؤقت.' : 'Ownership verified and temporary download link created.' };
  }, [currentUser, language]);

  // Admin Product Management uses the authenticated server endpoint; never writes catalog data directly from the browser.
  const adminSaveProduct = useCallback(async (prodData: Partial<Product>) => {
    if (!supabase) return { success: false, message: 'Supabase is not configured.' };
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { success: false, message: language === 'ar' ? 'سجّل الدخول أولاً.' : 'Please sign in first.' };
    const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ product: prodData }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.product) return { success: false, message: result.message || (language === 'ar' ? 'تعذر حفظ المنتج.' : 'Could not save product.') };
    const savedProduct = result.product as Product;
    setProducts((prev) => [savedProduct, ...prev.filter((item) => item.id !== savedProduct.id)]);
    logAuditEvent(prodData.id ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE', { productId: savedProduct.id });
    return { success: true };
  }, [language]);

  const adminArchiveProduct = useCallback(async (productId: string) => {
    if (!supabase) return { success: false, message: 'Supabase is not configured.' };
    const { data } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/archive`, { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return { success: false, message: result.message || (language === 'ar' ? 'تعذرت أرشفة المنتج.' : 'Could not archive product.') };
    setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, status: 'archived' } : p));
    return { success: true };
  }, [language]);

  const adminAddProduct = useCallback((prod: Partial<Product>) => adminSaveProduct(prod), [adminSaveProduct]);

  // Escrow actions call authenticated server endpoints; never report success after a failed request.
  const updateEscrowThreshold = useCallback(async (threshold: number) => {
    if (!supabase) return { success: false, message: 'Supabase is not configured.' };
    const { data } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/escrow-threshold', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ threshold }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return { success: false, message: result.message || 'تعذر تحديث حد الضمان.' };
    setEscrowThreshold(Number(result.threshold));
    return { success: true };
  }, []);

  const confirmEscrowDelivery = useCallback(async (orderId: string) => {
    if (!supabase) return { success: false, message: 'Supabase is not configured.' };
    const { data } = await supabase.auth.getSession();
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/confirm-delivery`, { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return { success: false, message: result.message || 'تعذر تأكيد التسليم.' };
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'completed', escrowReleasedAt: new Date().toISOString() } : o));
    return { success: true };
  }, []);

  const disputeEscrowOrder = useCallback(async (orderId: string, reason: string) => {
    if (!supabase) return { success: false, message: 'Supabase is not configured.' };
    const { data } = await supabase.auth.getSession();
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/dispute`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ reason }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return { success: false, message: result.message || 'تعذر فتح النزاع.' };
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'escrow_disputed', disputeId: result.disputeId } : o));
    return { success: true, disputeId: result.disputeId };
  }, []);

  const resolveEscrowDispute = useCallback(async (disputeId: string, decision: 'refund_buyer' | 'release_seller') => {
    if (!supabase) return { success: false, message: 'Supabase is not configured.' };
    const { data } = await supabase.auth.getSession();
    const response = await fetch('/api/admin/disputes/settle', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify({ disputeId, decision }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return { success: false, message: result.message || (language === 'ar' ? 'تعذرت تسوية النزاع.' : 'Dispute settlement failed.') };
    const orderId = String(result.result?.orderId || '');
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, status: decision === 'refund_buyer' ? 'refunded' : 'completed', disputeResolvedAt: new Date().toISOString(), disputeDecision: decision, escrowReleasedAt: decision === 'release_seller' ? new Date().toISOString() : order.escrowReleasedAt } : order));
    window.dispatchEvent(new Event('supabase-disputes-updated'));
    logAuditEvent(decision === 'refund_buyer' ? 'ESCROW_DISPUTE_REFUNDED' : 'ESCROW_DISPUTE_RELEASED', { disputeId, orderId, reference: result.result?.reference });
    return { success: true, message: language === 'ar' ? 'تمت تسوية النزاع وتسجيل القيد المحاسبي.' : 'Dispute settled and ledger entry recorded.' };
  }, [language, setOrders]);

  const value = useMemo(
    () => ({
      products,
      selectedProduct,
      setSelectedProduct,
      orders,
      purchaseProduct,
      downloadProductFile,
      adminSaveProduct,
      adminArchiveProduct,
      adminAddProduct,
      escrowThreshold,
      updateEscrowThreshold,
      confirmEscrowDelivery,
      disputeEscrowOrder,
      resolveEscrowDispute,
      setProducts,
      setOrders,
    }),
    [
      products,
      selectedProduct,
      orders,
      purchaseProduct,
      downloadProductFile,
      adminSaveProduct,
      adminArchiveProduct,
      adminAddProduct,
      escrowThreshold,
      updateEscrowThreshold,
      confirmEscrowDelivery,
      disputeEscrowOrder,
      resolveEscrowDispute,
    ]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error('useProducts must be used within ProductsProvider');
  }
  return ctx;
}
