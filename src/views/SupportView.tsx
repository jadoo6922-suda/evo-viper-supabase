import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { supabase } from '../lib/supabase';
import { MessageCircle, Plus, Send, RefreshCw, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';

type Ticket = { id: string; subject: string; message: string; status: string; priority: string; created_at: string; updated_at: string; user_id: string };
type TicketMessage = { id: string; ticket_id: string; sender_id: string | null; sender_type: string; message: string; created_at: string };

const statusLabel = (status: string, isAr: boolean) => ({ open: isAr ? 'مفتوحة' : 'Open', waiting_user: isAr ? 'بانتظارك' : 'Waiting for you', waiting_support: isAr ? 'بانتظار الدعم' : 'Waiting for support', resolved: isAr ? 'تم الحل' : 'Resolved', closed: isAr ? 'مغلقة' : 'Closed' } as Record<string,string>)[status] || status;

export const SupportView: React.FC = () => {
  const { language, currentUser } = useStore();
  const isAr = language === 'ar';
  const isStaff = ['admin','super_admin','support'].includes(currentUser?.role || '');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [reply, setReply] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const request = useCallback(async (url: string, init: RequestInit = {}) => {
    const { data } = await supabase?.auth.getSession() || { data: { session: null } };
    const token = data.session?.access_token;
    if (!token) throw new Error(isAr ? 'انتهت الجلسة، سجّل الدخول مجدداً.' : 'Session expired; please sign in again.');
    const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || (isAr ? 'تعذر إكمال العملية.' : 'Request failed.'));
    return result;
  }, [isAr]);

  const loadTickets = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await request('/api/support/tickets'); setTickets(result.tickets || []); }
    catch (e: any) { setError(e?.message || 'تعذر تحميل التذاكر.'); }
    finally { setLoading(false); }
  }, [request]);

  const loadMessages = useCallback(async (ticket: Ticket) => {
    setSelected(ticket); setError('');
    try { const result = await request(`/api/support/tickets/${ticket.id}/messages`); setMessages(result.messages || []); }
    catch (e: any) { setError(e?.message || 'تعذر تحميل المحادثة.'); }
  }, [request]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const createTicket = async () => {
    setLoading(true); setError(''); setNotice('');
    try {
      const result = await request('/api/support/tickets', { method: 'POST', body: JSON.stringify({ subject, message: initialMessage }) });
      setSubject(''); setInitialMessage(''); setShowCreate(false); setNotice(isAr ? 'تم إنشاء تذكرة الدعم.' : 'Support ticket created.');
      await loadTickets();
      if (result.ticket) await loadMessages(result.ticket);
    } catch (e: any) { setError(e?.message || 'تعذر إنشاء التذكرة.'); }
    finally { setLoading(false); }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setLoading(true); setError('');
    try {
      await request(`/api/support/tickets/${selected.id}/messages`, { method: 'POST', body: JSON.stringify({ message: reply }) });
      setReply(''); await loadMessages(selected); await loadTickets();
    } catch (e: any) { setError(e?.message || 'تعذر إرسال الرد.'); }
    finally { setLoading(false); }
  };

  const setStatus = async (status: string) => {
    if (!selected) return;
    setLoading(true); setError('');
    try {
      await request(`/api/support/tickets/${selected.id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      const updated = { ...selected, status, updated_at: new Date().toISOString() }; setSelected(updated);
      await loadTickets();
    } catch (e: any) { setError(e?.message || 'تعذر تحديث الحالة.'); }
    finally { setLoading(false); }
  };

  return <section className="space-y-5 text-white">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div><div className="flex items-center gap-2 text-[#c5a059]"><MessageCircle className="w-5 h-5"/><span className="text-[10px] uppercase tracking-[.25em]">Customer Care</span></div><h1 className="mt-2 text-2xl font-black">{isAr ? 'مركز الدعم الفني' : 'Support Center'}</h1><p className="mt-1 text-sm text-white/50">{isAr ? 'افتح تذكرة وتابع الردود في مكان واحد.' : 'Create a ticket and keep all replies in one place.'}</p></div>
      <div className="flex gap-2"><button onClick={() => void loadTickets()} className="rounded-xl border border-white/10 p-3 text-white/70 hover:bg-white/5" aria-label="Refresh"><RefreshCw className="w-4 h-4"/></button><button onClick={() => setShowCreate(v => !v)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#801428] to-[#590e1c] px-4 py-3 text-sm font-bold border border-[#c5a059]/30"><Plus className="w-4 h-4"/>{isAr ? 'تذكرة جديدة' : 'New ticket'}</button></div>
    </header>
    {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-3 text-sm text-emerald-200">{notice}</div>}
    {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-950/20 p-3 text-sm text-red-200">{error}</div>}
    {showCreate && <div className="rounded-2xl border border-[#c5a059]/20 bg-[#10141b] p-5 space-y-3"><h2 className="font-bold">{isAr ? 'فتح تذكرة دعم' : 'Open a support ticket'}</h2><input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={120} placeholder={isAr ? 'عنوان المشكلة' : 'Issue subject'} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm"/><textarea value={initialMessage} onChange={e=>setInitialMessage(e.target.value)} maxLength={4000} rows={4} placeholder={isAr ? 'اشرح المشكلة بالتفصيل...' : 'Describe the issue...'} className="w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm"/><div className="flex justify-end gap-2"><button onClick={()=>setShowCreate(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm">{isAr ? 'إلغاء' : 'Cancel'}</button><button onClick={()=>void createTicket()} disabled={loading||subject.trim().length<5||initialMessage.trim().length<10} className="rounded-xl bg-[#801428] px-4 py-2 text-sm font-bold disabled:opacity-40">{isAr ? 'إرسال التذكرة' : 'Submit ticket'}</button></div></div>}
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.5fr)] gap-4">
      <div className="space-y-2">{loading && tickets.length===0 && <p className="p-5 text-sm text-white/50">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</p>}{tickets.length===0&&!loading&&<div className="rounded-2xl border border-white/10 bg-[#10141b] p-6 text-center text-sm text-white/45">{isAr ? 'لا توجد تذاكر بعد.' : 'No tickets yet.'}</div>}{tickets.map(ticket=><button key={ticket.id} onClick={()=>void loadMessages(ticket)} className={`w-full rounded-2xl border p-4 text-right transition ${selected?.id===ticket.id?'border-[#c5a059]/50 bg-[#c5a059]/[0.06]':'border-white/10 bg-[#10141b] hover:bg-white/[0.03]'}`}><div className="flex items-start justify-between gap-2"><p className="text-sm font-bold">{ticket.subject}</p><span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-[#d9b76d]">{statusLabel(ticket.status,isAr)}</span></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">{ticket.message}</p><p className="mt-3 text-[10px] text-white/30">{new Date(ticket.updated_at||ticket.created_at).toLocaleString()}</p></button>)}</div>
      <div className="min-h-[420px] rounded-2xl border border-white/10 bg-[#10141b] flex flex-col overflow-hidden">{!selected?<div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-white/40"><MessageCircle className="mb-3 h-9 w-9 text-[#c5a059]/60"/><p className="text-sm">{isAr ? 'اختر تذكرة لعرض المحادثة' : 'Select a ticket to view the conversation'}</p></div>:<><div className="flex items-start justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="font-bold">{selected.subject}</h2><p className="mt-1 text-[10px] text-white/40">#{selected.id.slice(0,8)} · {statusLabel(selected.status,isAr)}</p></div>{isStaff&&<select value={selected.status} onChange={e=>void setStatus(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 p-2 text-xs"><option value="open">Open</option><option value="waiting_user">Waiting user</option><option value="waiting_support">Waiting support</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>}</div><div className="flex-1 space-y-3 p-4">{messages.map(message=><div key={message.id} className={`max-w-[90%] rounded-xl p-3 ${message.sender_type==='staff'?'ml-auto bg-[#801428]/25 border border-[#c5a059]/15':'mr-auto bg-white/[0.04] border border-white/5'}`}><div className="mb-1 flex items-center gap-2 text-[10px] text-white/40">{message.sender_type==='staff'?<ShieldCheck className="h-3 w-3 text-[#c5a059]"/>:<MessageCircle className="h-3 w-3"/>}{message.sender_type==='staff'?(isAr?'الدعم':'Support'):(isAr?'أنت':'You')}<span>· {new Date(message.created_at).toLocaleString()}</span></div><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.message}</p></div>)}{messages.length===0&&<p className="text-sm text-white/40">{isAr?'لا توجد رسائل.':'No messages.'}</p>}</div><div className="border-t border-white/10 p-3"><div className="flex gap-2"><textarea value={reply} onChange={e=>setReply(e.target.value)} maxLength={4000} rows={2} placeholder={isAr?'اكتب ردك...':'Write a reply...'} className="min-w-0 flex-1 resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm"/><button onClick={()=>void sendReply()} disabled={loading||!reply.trim()||(!isStaff&&['resolved','closed'].includes(selected.status))} className="self-end rounded-xl bg-[#801428] p-3 disabled:opacity-40" aria-label="Send"><Send className="h-4 w-4"/></button></div>{!isStaff&&['resolved','closed'].includes(selected.status)&&<p className="mt-2 flex items-center gap-1 text-[10px] text-white/40"><CheckCircle2 className="h-3 w-3"/>{isAr?'هذه التذكرة مغلقة. افتح تذكرة جديدة للمتابعة.':'This ticket is closed. Open a new ticket to continue.'}</p>}</div></>}</div>
    </div>
    <div className="flex items-center gap-2 text-[10px] text-white/30"><Clock3 className="h-3 w-3"/>{isAr?'قد تحتاج الردود إلى بعض الوقت حسب ضغط الدعم.':'Replies may take time depending on support volume.'}</div>
  </section>;
};
