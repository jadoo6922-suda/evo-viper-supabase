import React, { useState } from 'react';
import {
  Coins,
  Search,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Send,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { User } from '../../types';

export const AdminGiveCoins: React.FC = () => {
  const { users, getUserBalance, adminAdjustUserBalance, language, transactions } = useStore();
  const isAr = language === 'ar';

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [amount, setAmount] = useState<string>('100');
  const [reason, setReason] = useState<string>('مكافأة شحن إدارية');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleGiveCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!selectedUserId) {
      setStatusMessage({
        type: 'error',
        text: isAr ? 'يرجى اختيار المستخدم المراد منح الكوينز له.' : 'Please select a user to give coins to.',
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatusMessage({
        type: 'error',
        text: isAr ? 'يرجى إدخال عدد كوينز صحيح وموجب.' : 'Please enter a valid positive coin amount.',
      });
      return;
    }

    if (!reason.trim()) {
      setStatusMessage({
        type: 'error',
        text: isAr ? 'يرجى كتابة سبب أو ملاحظة المنح للتوثيق المالي.' : 'Please provide an audit reason.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminAdjustUserBalance(selectedUserId, numAmount, reason.trim());
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: isAr
            ? `تم تسجيل منح ${numAmount} كوين للمستخدم ${selectedUser?.displayName || selectedUserId} على الخادم بنجاح.`
            : `Successfully credited ${numAmount} Coins to ${selectedUser?.displayName || selectedUserId} on the server.`,
        });
        setAmount('100');
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || (isAr ? 'فشلت عملية المنح.' : 'Coin grant failed.'),
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || (isAr ? 'حدث خطأ غير متوقع أثناء المعاملة.' : 'Unexpected error during operation.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recent admin coin adjustments
  const recentGrants = transactions
    .filter((t) => t.type === 'admin_adjustment')
    .slice(0, 5);

  return (
    <div className="space-y-6" id="admin-give-coins-module">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#12161d] border border-[#c5a059]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#801428] to-[#590e1c] text-[#c5a059] border border-[#c5a059]/40 shadow-lg">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {isAr ? 'قسم إعطاء كوينز لأي مستخدم في الموقع' : 'Credit Coins to User'}
            </h2>
            <p className="text-xs text-white/60">
              {isAr
                ? 'اختر أي مستخدم وحدد كمية الكوينز لمنحها له مباشرة مع قيد محاسبي مزدوج وفوري'
                : 'Select any registered user and grant coins with atomic double-entry ledger verification'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Selection & Search (Left Column) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white uppercase tracking-wider">
              {isAr ? '1. اختر المستخدم المستلم' : '1. Select Recipient'}
            </label>
            <span className="text-[11px] text-white/40">{filteredUsers.length} {isAr ? 'مستخدم' : 'users'}</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث بالاسم، الإيميل، أو المعرف...' : 'Search by name, email, or ID...'}
              className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2.5 rounded-xl bg-[#12161d] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
            />
          </div>

          {/* Users List with Balances */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {filteredUsers.map((u) => {
              const isSelected = selectedUserId === u.id;
              const bal = getUserBalance(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#801428]/40 to-[#590e1c]/40 border-[#c5a059] shadow-md shadow-[#801428]/20'
                      : 'bg-[#12161d] border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected
                          ? 'bg-[#c5a059] text-black'
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{u.displayName}</span>
                        {u.role === 'super_admin' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/40 block truncate max-w-[170px]">{u.email}</span>
                    </div>
                  </div>

                  <div className="text-right rtl:text-left">
                    <span className="text-xs font-black text-amber-400 block">{bal}</span>
                    <span className="text-[9px] text-white/40 uppercase">Coins</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coin Amount & Form (Right Column) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleGiveCoins} className="p-6 rounded-2xl bg-[#12161d] border border-white/10 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#c5a059]" />
              <span>{isAr ? '2. تحديد كمية الكوينز وتفاصيل المعاملة' : '2. Coins Amount & Memo'}</span>
            </h3>

            {/* Selected User Display Banner */}
            {selectedUser ? (
              <div className="p-3.5 rounded-xl bg-black/40 border border-[#c5a059]/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-white/50 block">{isAr ? 'المستخدم المختار للمنح:' : 'Target Recipient:'}</span>
                  <p className="text-xs font-bold text-white">
                    {selectedUser.displayName}{' '}
                    <span className="font-normal text-white/50">({selectedUser.email})</span>
                  </p>
                </div>
                <div className="text-right rtl:text-left">
                  <span className="text-[10px] text-white/50 block">{isAr ? 'الرصيد الحالي' : 'Current Balance'}</span>
                  <span className="text-xs font-black text-amber-400">{getUserBalance(selectedUser.id)} Coins</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-white/50 text-center">
                {isAr ? '← اختر مستخدماً من القائمة الجانبية لبدء المنح' : '← Select a user from the left list'}
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/80 block">
                {isAr ? 'عدد الكوينز المراد منحها' : 'Amount of Coins to Grant'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-lg font-black text-amber-400 focus:outline-none focus:border-[#c5a059]"
                />
                <span className="absolute top-1/2 -translate-y-1/2 right-4 rtl:right-auto rtl:left-4 text-xs font-bold text-white/40">
                  COINS
                </span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {[50, 100, 250, 500, 1000].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#801428]/30 hover:border-[#c5a059]/40 border border-white/10 text-xs text-white/80 font-semibold cursor-pointer transition-all"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason / Memo */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/80 block">
                {isAr ? 'سبب أو ملاحظة المنح (للتوثيق المحاسبي والتدقيق)' : 'Audit Reason / Memo'}
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isAr ? 'مثلاً: شحن رصيد يدوي، مكافأة مسابقة، تعويض عميل' : 'e.g. Manual top-up via WhatsApp, contest reward'}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
              />
            </div>

            {/* Status Alert */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedUserId}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !selectedUserId
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#801428] via-[#a31a33] to-[#801428] hover:brightness-110 text-white border border-[#c5a059]/40 shadow-lg shadow-[#801428]/40'
              }`}
            >
              <Coins className="w-4 h-4 text-[#c5a059]" />
              <span>
                {isSubmitting
                  ? isAr
                    ? 'جاري منح الكوينز وتوثيق الدفتر...'
                    : 'Processing Ledger Credit...'
                  : isAr
                  ? `منح ${amount || 0} كوينز للمستخدم فوراً`
                  : `Execute ${amount || 0} Coins Grant Now`}
              </span>
            </button>
          </form>

          {/* Recent Grants Ledger Preview */}
          {recentGrants.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-[#12161d] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white/60">
                <History className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>{isAr ? 'سجل آخر عمليات المنح الإداري' : 'Recent Admin Credits'}</span>
              </div>
              <div className="space-y-1.5">
                {recentGrants.map((rg) => (
                  <div
                    key={rg.id}
                    className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-black/30 border border-white/5"
                  >
                    <div>
                      <span className="font-bold text-white">{rg.receiverName || rg.receiverId}</span>
                      <span className="text-white/40 block text-[10px]">{rg.description}</span>
                    </div>
                    <div className="text-right rtl:text-left font-black text-emerald-400">
                      +{rg.amount} Coins
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
