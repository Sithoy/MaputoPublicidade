'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';

export type SupportContext = {
  kind: 'quote' | 'order' | 'invoice'; reference?: string; title?: string;
  status?: string; available: boolean;
};
const labels = { quote: 'Proposta', order: 'Projeto', invoice: 'Fatura' };
const routes = { quote: 'orcamentos', order: 'encomendas', invoice: 'faturas' };

export function SupportContextCard({ context, staff = false }: { context: SupportContext; staff?: boolean }) {
  return <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{labels[context.kind]} {context.kind === 'order' ? 'relacionado' : 'relacionada'}</p>
    {context.available ? <>
      <p className="mt-1 font-semibold">{context.reference}{context.title ? ` · ${context.title}` : ''}</p>
      <p className="mt-1 text-slate-600">{context.status}</p>
      <Link href={`${staff ? '/admin' : '/area-cliente'}/${routes[context.kind]}/${encodeURIComponent(context.reference || '')}`} className="mt-2 inline-block font-semibold text-brand-800">Abrir {labels[context.kind].toLowerCase()}</Link>
    </> : <p className="mt-2 text-slate-600">Este registo não está disponível para a sua conta ou função.</p>}
  </div>;
}

export function SupportContextPicker({ initial, onChange, onReady }: {
  initial: { kind: SupportContext['kind']; reference: string } | null;
  onChange: (value: SupportContext | null) => void; onReady: (ready: boolean) => void;
}) {
  const [kind, setKind] = useState(initial?.kind || '');
  const [search, setSearch] = useState('');
  const [preselect, setPreselect] = useState(initial?.reference || '');
  const [rows, setRows] = useState<SupportContext[]>([]);
  const [selected, setSelected] = useState<SupportContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!kind) { onChange(null); onReady(true); setLoading(false); setError(''); return; }
    setLoading(true); setError('');
    if (preselect) { onChange(null); onReady(false); }
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ kind, ...(preselect ? { reference: preselect } : { q: search }) });
      fetchWithAuth(`/api/support-conversations/contexts/?${query}`).then((page) => {
        if (cancelled) return;
        setRows(page.results);
        if (preselect) {
          const match = (page.results as SupportContext[]).find((row) => row.reference === preselect);
          if (match) { setSelected(match); onChange(match); onReady(true); }
          else setError('Este registo não está disponível. Escolha outro ou use Assunto geral.');
        }
      }).catch(() => { if (!cancelled) setError('Não foi possível carregar os registos. Tente novamente.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [kind, search, preselect, retry, onChange, onReady]);

  return <div className="space-y-3 rounded-xl border border-slate-200 p-4">
    <label className="block text-sm font-medium">Relacionar com…
      <select value={kind} onChange={(event) => {
        setKind(event.target.value as SupportContext['kind'] | ''); setSearch(''); setPreselect(''); setRows([]); setSelected(null);
        onChange(null); onReady(!event.target.value);
      }} className="mt-2 w-full rounded-xl border bg-white p-3">
        <option value="">Assunto geral</option><option value="quote">Proposta / pedido</option><option value="order">Projeto</option><option value="invoice">Fatura</option>
      </select>
    </label>
    {kind ? <>
      <label className="block text-sm font-medium">Pesquisar referência
        <input value={search} maxLength={100} onChange={(event) => { setPreselect(''); setSearch(event.target.value); }} className="mt-2 w-full rounded-xl border p-3" placeholder="Ex.: MP-0001-2026" />
      </label>
      <label className="block text-sm font-medium">Escolher registo
        <select disabled={loading} value={selected?.reference || ''} onChange={(event) => {
          const row = rows.find((item) => item.reference === event.target.value) || null;
          setSelected(row); onChange(row); onReady(Boolean(row));
        }} className="mt-2 w-full rounded-xl border bg-white p-3">
          <option value="">{loading ? 'A carregar…' : 'Selecione um registo'}</option>
          {selected && !rows.some((row) => row.reference === selected.reference) ? <option value={selected.reference}>{selected.reference}</option> : null}
          {rows.map((row) => <option key={row.reference} value={row.reference}>{row.reference}{row.title ? ` · ${row.title}` : ''} — {row.status}</option>)}
        </select>
      </label>
      <p className="text-xs text-slate-500">São mostrados os registos mais recentes. Pesquise pela referência para encontrar os anteriores.</p>
      {!loading && !error && !rows.length ? <p className="text-xs text-slate-500">Nenhum registo encontrado.</p> : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">Tentar novamente</button></p> : null}
      {selected ? <SupportContextCard context={selected} /> : null}
    </> : <p className="text-xs text-slate-500">Pode conversar com a MP sem associar um documento.</p>}
  </div>;
}

export function SupportContextLink({ kind, reference }: { kind: SupportContext['kind']; reference: string }) {
  const query = { quote: 'pedido', order: 'projeto', invoice: 'fatura' }[kind];
  return <Link href={`/area-cliente/apoio?${query}=${encodeURIComponent(reference)}`} className="inline-flex items-center rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">Falar com a MP sobre isto</Link>;
}
