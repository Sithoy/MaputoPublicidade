'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ReceptionPagination({ page, pageSize, count, shown, hasNext, loading, busy, onPage }: {
  page: number; pageSize: number; count: number; shown: number; hasNext: boolean;
  loading: boolean; busy: boolean; onPage: (value: number) => void;
}) {
  const start = shown ? (page - 1) * pageSize + 1 : 0;
  const end = shown ? start + shown - 1 : 0;
  return <footer className="desk-reception-footer flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
    <div><p aria-live="polite" className="text-xs font-semibold text-brand-900">{loading ? 'A carregar pedidos…' : `${start}–${end} de ${count} pedidos`}</p><p className="mt-1 text-[11px] text-slate-500">O pedido aberto mantém-se ao mudar de página.</p></div>
    <nav aria-label="Paginação dos pedidos" className="flex items-center gap-3"><button type="button" disabled={busy || loading || page <= 1} onClick={() => onPage(page - 1)} className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Anterior</button><span className="text-xs text-slate-600">Página {page} de {Math.max(1, Math.ceil(count / pageSize))}</span><button type="button" disabled={busy || loading || !hasNext} onClick={() => onPage(page + 1)} className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Seguinte<ChevronRight aria-hidden="true" className="h-4 w-4" /></button></nav>
  </footer>;
}
