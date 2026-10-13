'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, MessagesSquare } from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';
import { SupportDesk } from '@/components/SupportDesk';
import { EmailDesk } from './EmailDesk';

export type InboxSummary = { email: number; email_unread: number; conversations: number; conversation_unread: number; stages: Record<string, number> };
export function CommunicationWorkspace({ quoteReference, onDirtyChange, onBusyChange }: {
  quoteReference?: string; onDirtyChange?: (value: boolean) => void; onBusyChange?: (value: boolean) => void;
}) {
  const params = useSearchParams();
  const [tab, setTab] = useState<'email' | 'conversations'>(params.get('canal') === 'conversas' ? 'conversations' : 'email');
  const [summary, setSummary] = useState<InboxSummary | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [followLink, setFollowLink] = useState(true);
  const [opening, setOpening] = useState(false);
  const conversation = quoteReference ? null : Number(params.get('conversa')) || null;
  const requestedChannel = params.get('canal');
  const workState = useRef({ dirty, busy });
  workState.current = { dirty, busy };
  const loadSummary = useCallback(() => {
    const query = quoteReference ? `?operational_quote=${encodeURIComponent(quoteReference)}` : '';
    void fetchWithAuth(`/api/support-conversations/inbox-summary/${query}`).then(setSummary).catch(() => setSummary(null));
  }, [quoteReference]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    if (workState.current.busy || (workState.current.dirty && !window.confirm('Existem alterações por guardar. Abrir esta ligação sem as guardar?'))) {
      setFollowLink(false);
      return;
    }
    setDirty(false);
    setFollowLink(true);
    if (requestedChannel) { setTab(requestedChannel === 'conversas' ? 'conversations' : 'email'); return; }
    if (!conversation) return;
    let active = true; setOpening(true); setFollowLink(true);
    fetchWithAuth(`/api/support-conversations/${conversation}/`).then((value) => { if (active) setTab(value.channel === 'email' ? 'email' : 'conversations'); })
      .finally(() => { if (active) setOpening(false); }).catch(() => { /* Child reports unavailable references without exposing another account. */ });
    return () => { active = false; };
  }, [conversation, requestedChannel]);
  function open(next: 'email' | 'conversations') {
    if (next === tab || busy || (dirty && !window.confirm('Existem alterações por guardar. Deseja mudar de área sem as guardar?'))) return;
    setDirty(false); setFollowLink(false); setTab(next); loadSummary();
  }
  return <section className="space-y-5" aria-label="Caixa de entrada da Recepção">
    <header className="rounded-2xl border border-[#dce3d5] bg-gradient-to-r from-[#173f30] to-[#285840] p-5 text-white"><p className="text-[10px] uppercase tracking-[0.2em] text-[#d6bd79]">ATENDIMENTO · CORRESPONDÊNCIA</p><h2 className="mt-2 text-2xl font-semibold">Caixa de entrada</h2><p className="mt-2 text-sm text-white/75">Emails com estrutura. Conversas com proximidade. O contexto do cliente acompanha ambos.</p></header>
    <div role="tablist" aria-label="Canais de atendimento" className="flex gap-2 border-b border-[#dce3d5] pb-3">
      {(['email', 'conversations'] as const).map((kind) => <button key={kind} role="tab" id={`mp-tab-${kind}`} aria-selected={tab === kind} aria-controls={`mp-panel-${kind}`} disabled={busy || opening} onClick={() => open(kind)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${tab === kind ? 'bg-[#173f30] font-semibold text-white' : 'bg-white text-brand-800'}`}>{kind === 'email' ? <Mail className="h-4 w-4" /> : <MessagesSquare className="h-4 w-4" />}{kind === 'email' ? 'Email' : 'Conversas'}{summary && typeof summary.email === 'number' ? <span className={`rounded-md px-2 py-0.5 text-xs ${tab === kind ? 'bg-white/15' : 'bg-slate-100'}`}>{kind === 'email' ? summary.email_unread : summary.conversation_unread} por ler</span> : null}</button>)}
    </div>
    {opening ? <p role="status">A localizar a correspondência…</p> : <div role="tabpanel" id={`mp-panel-${tab}`} aria-labelledby={`mp-tab-${tab}`}>
      {tab === 'email' ? <EmailDesk initialConversation={followLink ? conversation : null} quoteReference={quoteReference} summary={summary} onDirtyChange={setDirty} onBusyChange={setBusy} onChanged={loadSummary} /> : <SupportDesk staff quoteReference={quoteReference} channelGroup="conversations" ignoreConversationLink={!followLink} onDirtyChange={setDirty} onBusyChange={setBusy} />}
    </div>}
  </section>;
}
