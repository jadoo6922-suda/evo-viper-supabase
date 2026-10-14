import React, { useState } from 'react';
import {
  FileText,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Eye,
  ShieldCheck,
  Hash,
  Download,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Transaction } from '../../types';

export const AdminTransferRecords: React.FC = () => {
  const { transactions, setSelectedReceipt, language } = useStore();
  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'transfers' | 'top_up' | 'adjustment'>('all');

  const filteredTransactions = transactions.filter((tx) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = tx.id.toLowerCase().includes(q);
      const matchRef = tx.reference.toLowerCase().includes(q);
      const matchSender = tx.senderName?.toLowerCase().includes(q) || tx.senderId?.toLowerCase().includes(q);
      const matchReceiver = tx.receiverName.toLowerCase().includes(q) || tx.receiverId.toLowerCase().includes(q);
      if (!matchId && !matchRef && !matchSender && !matchReceiver) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && tx.status !== statusFilter) {
      return false;
    }

    // Type filter
    if (typeFilter === 'transfers') {
      if (tx.type !== 'transfer_sent' && tx.type !== 'transfer_received') return false;
    } else if (typeFilter === 'top_up') {
      if (tx.type !== 'top_up') return false;
    } else if (typeFilter === 'adjustment') {
      if (tx.type !== 'admin_adjustment') return false;
    }

    return true;
  });

  return (
    <div className="space-y-6" id="admin-transfer-records-module">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-[#12161d] border border-[#c5a059]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#801428] to-[#590e1c] text-[#c5a059] border border-[#c5a059]/40 shadow-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {isAr ? 'قسم السجلات لكل عمليات التحويل والمعاملات' : 'Transfer Operations Ledger & Records'}
              </h2>
              <p className="text-xs text-white/60">
                {isAr
                  ? 'سجل غير قابل للتعديل يوثق جميع التحويلات مع الهاش التشفيري ومعرفات المعاملة'
                  : 'Immutable record of all transfer operations with cryptographic hashes'}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs">
            <span className="text-white/50">{isAr ? 'إجمالي المعاملات:' : 'Total Records:'}</span>
            <span className="font-mono font-bold text-[#c5a059]">{transactions.length}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-white/40 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث بالمعرف، الرقم المرجعي، أو الأطراف...' : 'Search ID, reference, parties...'}
            className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2.5 rounded-xl bg-[#12161d] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[#12161d] border border-white/5 text-xs">
            {(['all', 'completed', 'pending', 'failed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#801428] text-white'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {st === 'all' && (isAr ? 'الكل' : 'All')}
                {st === 'completed' && (isAr ? 'المكتملة' : 'Completed')}
                {st === 'pending' && (isAr ? 'قيد المعالجة' : 'Pending')}
                {st === 'failed' && (isAr ? 'فاشلة' : 'Failed')}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center p-1 rounded-xl bg-[#12161d] border border-white/5 text-xs">
            {(['all', 'transfers', 'top_up', 'adjustment'] as const).map((tp) => (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  typeFilter === tp
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {tp === 'all' && (isAr ? 'كل الأنواع' : 'All Types')}
                {tp === 'transfers' && (isAr ? 'تحويلات' : 'Transfers')}
                {tp === 'top_up' && (isAr ? 'شحن' : 'Top-ups')}
                {tp === 'adjustment' && (isAr ? 'تعديل إداري' : 'Admin')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-[#12161d] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">{isAr ? 'المعرف والرقم المرجعي' : 'TX ID & Ref'}</th>
                <th className="p-4">{isAr ? 'النوع' : 'Type'}</th>
                <th className="p-4">{isAr ? 'المرسل' : 'Sender'}</th>
                <th className="p-4">{isAr ? 'المستلم' : 'Receiver'}</th>
                <th className="p-4">{isAr ? 'المبلغ' : 'Amount'}</th>
                <th className="p-4">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-4">{isAr ? 'الهاش المشفر' : 'Security Hash'}</th>
                <th className="p-4">{isAr ? 'الوقت' : 'Timestamp'}</th>
                <th className="p-4 text-center">{isAr ? 'الإيصال' : 'Receipt'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-white/40">
                    {isAr ? 'لا توجد سجلات تطابق معايير البحث' : 'No records match search criteria'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-white">{tx.id}</div>
                      <div className="font-mono text-[10px] text-white/40">{tx.reference}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white/80 border border-white/10">
                        {tx.type === 'transfer_sent' && (isAr ? 'تحويل صادر' : 'Transfer Sent')}
                        {tx.type === 'transfer_received' && (isAr ? 'تحويل وارد' : 'Transfer Recv')}
                        {tx.type === 'top_up' && (isAr ? 'شحن محفظة' : 'Top Up')}
                        {tx.type === 'admin_adjustment' && (isAr ? 'تعديل إداري' : 'Admin Adj')}
                        {tx.type === 'purchase' && (isAr ? 'شراء منتج' : 'Purchase')}
                        {tx.type === 'refund' && (isAr ? 'استرداد' : 'Refund')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{tx.senderName || tx.senderId || '—'}</div>
                      {tx.senderId && <div className="text-[10px] text-white/40 font-mono">{tx.senderId}</div>}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">{tx.receiverName}</div>
                      <div className="text-[10px] text-white/40 font-mono">{tx.receiverId}</div>
                    </td>
                    <td className="p-4 font-black text-amber-400">
                      {tx.amount} Coins
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : tx.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {tx.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {tx.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                        {tx.status === 'failed' && <XCircle className="w-2.5 h-2.5" />}
                        <span>{tx.status}</span>
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-white/40 max-w-[120px] truncate">
                      {tx.securityVerificationHash ? tx.securityVerificationHash.substring(0, 16) + '...' : '—'}
                    </td>
                    <td className="p-4 text-white/50 text-[11px] whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(tx)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[#801428]/40 hover:text-[#c5a059] text-white/60 transition-all cursor-pointer"
                        title={isAr ? 'عرض الإيصال الرسمي' : 'View Receipt'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
