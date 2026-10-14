import React, { useState } from 'react';
import {
  Archive,
  BookOpen,
  AlertTriangle,
  History,
  Users,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminArchiveView: React.FC = () => {
  const { ledgerEntries, disputes, auditLogs, users, language } = useStore();
  const isAr = language === 'ar';

  const [archiveSection, setArchiveSection] = useState<'ledger' | 'disputes' | 'audit' | 'users'>('ledger');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6" id="admin-archive-module">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#12161d] border border-[#c5a059]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#801428] to-[#590e1c] text-[#c5a059] border border-[#c5a059]/40 shadow-lg">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {isAr ? 'قسم الأرشيف الشامل لكل سجلات النظام' : 'System-Wide Comprehensive Archive'}
            </h2>
            <p className="text-xs text-white/60">
              {isAr
                ? 'أرشيف موثق للدفتر المالي المزدوج، النزاعات المالية، سجلات التدقيق الأمني، وحسابات المستخدمين'
                : 'Auditable archive of general ledger entries, financial disputes, security logs, and users'}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Tabs for Archive */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto p-1 rounded-xl bg-[#12161d] border border-white/5 text-xs">
          {[
            { id: 'ledger', label: 'الدفتر المالي (General Ledger)', icon: BookOpen, count: ledgerEntries.length },
            { id: 'disputes', label: 'أرشيف النزاعات (Disputes)', icon: AlertTriangle, count: disputes.length },
            { id: 'audit', label: 'سجل التدقيق الأمني (Audit)', icon: History, count: auditLogs.length },
            { id: 'users', label: 'أرشيف المستخدمين (Users)', icon: Users, count: users.length },
          ].map((sec) => {
            const Icon = sec.icon;
            const isActive = archiveSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setArchiveSection(sec.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-[#801428] to-[#590e1c] text-white border border-[#c5a059]/40 shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#c5a059]' : ''}`} />
                <span>{sec.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/40 font-mono text-white/70">
                  {sec.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-white/40 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في الأرشيف...' : 'Search archive...'}
            className="w-full pl-8 pr-4 rtl:pl-4 rtl:pr-8 py-2 rounded-xl bg-[#12161d] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c5a059]"
          />
        </div>
      </div>

      {/* 1. GENERAL LEDGER ARCHIVE */}
      {archiveSection === 'ledger' && (
        <div className="rounded-2xl bg-[#12161d] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">{isAr ? 'معرف القيد المحاسبي' : 'Entry ID'}</th>
                  <th className="p-4">{isAr ? 'معرف المعاملة' : 'Transaction ID'}</th>
                  <th className="p-4">{isAr ? 'المستخدم' : 'User'}</th>
                  <th className="p-4">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="p-4">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className="p-4">{isAr ? 'الرصيد بعد الحركة' : 'Balance After'}</th>
                  <th className="p-4">{isAr ? 'الوصف' : 'Description'}</th>
                  <th className="p-4">{isAr ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ledgerEntries
                  .filter((entry) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      entry.id.toLowerCase().includes(q) ||
                      entry.transactionId.toLowerCase().includes(q) ||
                      entry.userId.toLowerCase().includes(q) ||
                      entry.description.toLowerCase().includes(q)
                    );
                  })
                  .map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-mono font-bold text-white">{entry.id}</td>
                      <td className="p-4 font-mono text-white/60">{entry.transactionId}</td>
                      <td className="p-4 font-mono text-[#c5a059]">{entry.userId}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            entry.type === 'credit'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {entry.type === 'credit' ? (isAr ? '+ إيداع' : '+ Credit') : (isAr ? '- خصم' : '- Debit')}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white">{entry.amount} Coins</td>
                      <td className="p-4 font-mono text-amber-400">{entry.balanceAfter} Coins</td>
                      <td className="p-4 text-white/70 max-w-xs truncate">{entry.description}</td>
                      <td className="p-4 text-white/50 text-[11px] whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DISPUTES ARCHIVE */}
      {archiveSection === 'disputes' && (
        <div className="rounded-2xl bg-[#12161d] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">{isAr ? 'معرف النزاع' : 'Dispute ID'}</th>
                  <th className="p-4">{isAr ? 'المعاملة المرتبطة' : 'Transaction ID'}</th>
                  <th className="p-4">{isAr ? 'الشاكي' : 'Claimant'}</th>
                  <th className="p-4">{isAr ? 'السبب' : 'Reason'}</th>
                  <th className="p-4">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className="p-4">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-4">{isAr ? 'التاريخ' : 'Created At'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono font-bold text-white">{d.id}</td>
                    <td className="p-4 font-mono text-[#c5a059]">{d.transactionId}</td>
                    <td className="p-4 text-white">{d.userId}</td>
                    <td className="p-4 text-white/70">{d.reasonLabel || d.reason}</td>
                    <td className="p-4 font-bold text-amber-400">{d.amount} Coins</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white">
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/50 text-[11px] whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. AUDIT LOGS ARCHIVE */}
      {archiveSection === 'audit' && (
        <div className="rounded-2xl bg-[#12161d] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">{isAr ? 'معرف السجل' : 'Log ID'}</th>
                  <th className="p-4">{isAr ? 'المنفذ' : 'Actor'}</th>
                  <th className="p-4">{isAr ? 'الإجراء' : 'Action'}</th>
                  <th className="p-4">{isAr ? 'الهدف' : 'Target'}</th>
                  <th className="p-4">{isAr ? 'النتيجة' : 'Result'}</th>
                  <th className="p-4">{isAr ? 'عنوان IP' : 'IP Address'}</th>
                  <th className="p-4">{isAr ? 'الوقت' : 'Timestamp'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono font-bold text-white">{log.id}</td>
                    <td className="p-4">
                      <div className="text-white font-medium">{log.actorEmail}</div>
                      <span className="text-[10px] text-white/40">{log.actorRole}</span>
                    </td>
                    <td className="p-4 font-mono text-[#c5a059]">{log.action}</td>
                    <td className="p-4 font-mono text-white/70">{log.target}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.result === 'success'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-white/40">{log.ip || '—'}</td>
                    <td className="p-4 text-white/50 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. USERS ARCHIVE */}
      {archiveSection === 'users' && (
        <div className="rounded-2xl bg-[#12161d] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">{isAr ? 'معرف المستخدم' : 'User ID'}</th>
                  <th className="p-4">{isAr ? 'الاسم والبريد' : 'Name & Email'}</th>
                  <th className="p-4">{isAr ? 'الدور' : 'Role'}</th>
                  <th className="p-4">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-4">{isAr ? 'كود التحويل' : 'Transfer Code'}</th>
                  <th className="p-4">{isAr ? 'تاريخ الإنشاء' : 'Created At'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono font-bold text-white">{u.id}</td>
                    <td className="p-4">
                      <div className="text-white font-bold">{u.displayName}</div>
                      <div className="text-white/40 text-[11px]">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-[#c5a059]">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-white/60">{u.transferCode || '—'}</td>
                    <td className="p-4 text-white/50 text-[11px] whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
