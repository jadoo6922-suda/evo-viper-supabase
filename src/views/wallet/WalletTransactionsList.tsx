import React, { useState } from 'react';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Transaction, User } from '../../types';

interface WalletTransactionsListProps {
  transactions: Transaction[];
  currentUser: User | null;
  isAr: boolean;
  onOpenReceipt: (tx: Transaction) => void;
}

export const WalletTransactionsList: React.FC<WalletTransactionsListProps> = ({
  transactions,
  currentUser,
  isAr,
  onOpenReceipt,
}) => {
  const [txFilter, setTxFilter] = useState<'all' | 'purchase' | 'sent' | 'received' | 'top_up' | 'refund'>('all');
  const [txSearch, setTxSearch] = useState('');

  // Filter transactions for user
  const userTransactions = transactions
    .filter((tx) => !currentUser || tx.senderId === currentUser.id || tx.receiverId === currentUser.id)
    .filter((tx) => {
      if (txFilter === 'purchase' && tx.type !== 'purchase') return false;
      if (txFilter === 'sent' && tx.type !== 'transfer_sent') return false;
      if (txFilter === 'received' && tx.type !== 'transfer_received' && tx.receiverId !== currentUser?.id)
        return false;
      if (txFilter === 'top_up' && tx.type !== 'top_up') return false;
      if (txFilter === 'refund' && tx.type !== 'refund') return false;

      if (!txSearch.trim()) return true;
      const q = txSearch.toLowerCase();
      return (
        tx.id.toLowerCase().includes(q) ||
        tx.reference.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        (tx.senderName && tx.senderName.toLowerCase().includes(q)) ||
        (tx.receiverName && tx.receiverName.toLowerCase().includes(q))
      );
    });

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {isAr ? 'سجل الحركات والقيود المالية' : 'Transaction History & Ledger'}
          </h2>
          <p className="text-xs text-white/40">
            {isAr ? 'كل حركة مقيدة بالدفتر المحاسبي مع إيصال رقمي مشفر' : 'Immutable double-entry records with cryptographic verification'}
          </p>
        </div>

        {/* Search within transactions */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-white/40 absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3" />
          <input
            type="text"
            value={txSearch}
            onChange={(e) => setTxSearch(e.target.value)}
            placeholder={isAr ? 'بحث بالمعرّف أو المرجع...' : 'Search by ID or reference...'}
            className="w-full bg-[#12161d] border border-white/10 rounded-xl py-2 ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#c5a059]/60"
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', name: 'الكل', nameEn: 'All' },
          { id: 'purchase', name: 'شراء', nameEn: 'Purchases' },
          { id: 'sent', name: 'إرسال', nameEn: 'Sent' },
          { id: 'received', name: 'استقبال', nameEn: 'Received' },
          { id: 'top_up', name: 'شحن', nameEn: 'Top-ups' },
          { id: 'refund', name: 'استرداد', nameEn: 'Refunds' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setTxFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              txFilter === f.id
                ? 'bg-white/15 text-white font-bold'
                : 'bg-[#12161d] text-white/60 hover:text-white hover:bg-white/5 border border-white/5'
            }`}
          >
            {isAr ? f.name : f.nameEn}
          </button>
        ))}
      </div>

      {/* Transactions Table / List */}
      <div className="rounded-2xl bg-[#12161d] border border-white/10 overflow-hidden">
        {userTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/40">
            {isAr ? 'لا توجد حركات مالية مسجلة' : 'No transactions found'}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {userTransactions.map((tx) => {
              const isDebit = tx.senderId === currentUser?.id;
              return (
                <div
                  key={tx.id}
                  onClick={() => onOpenReceipt(tx)}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'purchase'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : tx.type === 'top_up'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isDebit
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {tx.type === 'purchase' ? (
                        <WalletIcon className="w-4 h-4" />
                      ) : tx.type === 'top_up' ? (
                        <PlusCircle className="w-4 h-4" />
                      ) : isDebit ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-[#c5a059] transition-colors">
                          {tx.description}
                        </span>
                        <span className="text-[10px] font-mono text-white/40">{tx.id}</span>
                      </div>
                      <div className="text-[11px] text-white/50 flex items-center gap-2">
                        <span>
                          {isAr ? 'إلى / من:' : 'Party:'}{' '}
                          <span className="text-white/70">
                            {isDebit ? tx.receiverName : tx.senderName || 'System'}
                          </span>
                        </span>
                        <span>•</span>
                        <span>{new Date(tx.timestamp).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right rtl:text-left shrink-0">
                    <span
                      className={`text-sm font-bold block ${
                        isDebit ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {isDebit ? '-' : '+'}
                      {tx.amount.toFixed(2)} Coins
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#c5a059] group-hover:underline">
                      <span>{isAr ? 'عرض الإيصال' : 'View Receipt'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
