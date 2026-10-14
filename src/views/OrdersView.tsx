import React, { useState } from 'react';
import { PackageCheck, ExternalLink, AlertTriangle, CheckCircle2, RefreshCw, Lock } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface OrdersViewProps {
  onOpenDisputeForOrder: (order: any) => void;
  onNavigateToLibrary: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  onOpenDisputeForOrder,
  onNavigateToLibrary,
}) => {
  const { orders, currentUser, language, confirmEscrowDelivery } = useStore();
  const isAr = language === 'ar';
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const userOrders = orders.filter((o) => !currentUser || o.userId === currentUser.id);

  const handleConfirm = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      await confirmEscrowDelivery(orderId);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <PackageCheck className="w-6 h-6 text-[#c5a059]" />
            <span>{isAr ? 'سجل طلبات الشراء' : 'Orders & Invoices'}</span>
          </h1>
          <p className="text-xs text-white/50">
            {isAr
              ? 'متابعة حالة الطلبات، عمليات الخصم، وإمكانية فتح نزاع في حال وجود أي مشكلة.'
              : 'Monitor order statuses, ledger billing records, and file disputes if needed.'}
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#c5a059]">
          {userOrders.length} {isAr ? 'طلبات' : 'Total Orders'}
        </span>
      </div>

      {userOrders.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#12161d] border border-white/10 text-center space-y-3">
          <PackageCheck className="w-12 h-12 text-white/20 mx-auto" />
          <h3 className="text-sm font-bold text-white">
            {isAr ? 'لا توجد طلبات شراء مسجلة حتى الآن' : 'No purchase orders placed yet'}
          </h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {isAr
              ? 'تصفح المتجر الرقمي واختر منتجك الأول لتجربة التسليم الفوري والقيد المحاسبي.'
              : 'Browse our curated catalog to test instant delivery and ledger accounting.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#12161d] border border-white/10 overflow-hidden divide-y divide-white/5">
          {userOrders.map((order) => (
            <div
              key={order.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors"
            >
              <div className="flex items-center gap-4">
                <img
                  src={order.productThumbnail}
                  alt={order.productName}
                  className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0 bg-[#151a22]"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#c5a059]">#{order.id}</span>
                    {order.status === 'escrow_held' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>{isAr ? 'محجوز بالضمان (Escrow)' : 'Escrow Protected'}</span>
                      </span>
                    )}
                    {order.status === 'escrow_disputed' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{isAr ? 'نزاع قيد التحقيق' : 'Disputed'}</span>
                      </span>
                    )}
                    {(order.status === 'completed' || order.status === 'paid' || order.status === 'delivered') && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 capitalize">
                        {isAr ? 'مكتمل' : 'Completed'}
                      </span>
                    )}
                    {order.status === 'refunded' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400 capitalize">
                        {isAr ? 'مسترد' : 'Refunded'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">{order.productName}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-white/40">
                    <span>{new Date(order.createdAt).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
                    <span>•</span>
                    <span>{isAr ? 'المعاملة:' : 'TX:'} {order.transactionId}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                <div className="text-left rtl:text-right">
                  <span className="text-xs text-white/40 block">{isAr ? 'المبلغ المدفوع' : 'Amount'}</span>
                  <span className="text-sm font-extrabold text-white">{order.price} Coins</span>
                </div>

                <div className="flex items-center gap-2">
                  {order.status === 'escrow_held' && (
                    <button
                      onClick={() => handleConfirm(order.id)}
                      disabled={confirmingId === order.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{confirmingId === order.id ? (isAr ? 'جاري الإفراج...' : 'Releasing...') : (isAr ? 'أرسل خالص' : 'Confirm')}</span>
                    </button>
                  )}

                  <button
                    onClick={onNavigateToLibrary}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                  >
                    {isAr ? 'فتح في مكتبتي' : 'Vault Library'}
                  </button>

                  {order.status !== 'escrow_disputed' && order.status !== 'refunded' && (
                    <button
                      onClick={() => onOpenDisputeForOrder(order)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{isAr ? 'فتح نزاع' : 'Dispute'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
