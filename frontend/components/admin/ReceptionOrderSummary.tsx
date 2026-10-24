import type { AdminQuote } from '@/lib/admin-api';
import { ActivityTimeline } from '@/components/ActivityTimeline';

export function ReceptionOrderSummary({ quote }: { quote: AdminQuote }) {
  const description = quote.reception?.briefing?.description || quote.notes || '';
  const items = quote.items || [];
  const events = [...(quote.activity || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);
  return <section aria-label="Resumo do pedido" className="desk-order-summary grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,1fr)]">
    <section className="rounded-2xl border bg-white p-5"><p className="text-[10px] uppercase tracking-widest text-slate-500">O que o cliente precisa</p><h3 className="mt-2 font-semibold text-brand-900">Briefing e materiais</h3>
      {description ? <><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{description.length > 360 ? `${description.slice(0, 360)}…` : description}</p>{description.length > 360 ? <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-brand-800">Ler briefing completo</summary><p className="mt-3 whitespace-pre-wrap leading-6">{description}</p></details> : null}</> : <p className="mt-3 text-sm text-slate-500">A necessidade ainda precisa de ser confirmada na triagem.</p>}
      {items.length ? <ul className="mt-4 divide-y border-y">{items.slice(0, 5).map((item, index) => <li key={item.id || index} className="flex items-start justify-between gap-3 py-3 text-xs"><span className="min-w-0 text-slate-700">{item.description || item.product_name || 'Material por confirmar'}</span><span className="shrink-0 rounded-md bg-slate-50 px-2 py-1 font-semibold text-brand-900">{item.quantity} un.</span></li>)}</ul> : null}
      {items.length > 5 ? <p className="mt-2 text-xs text-slate-500">Mais {items.length - 5} materiais — consulte a proposta completa.</p> : null}
      <p className="mt-4 text-xs text-slate-500">Referências e ficheiros disponíveis em Documentos e histórico.</p>
    </section>
    <section className="rounded-2xl border bg-white p-5"><p className="text-[10px] uppercase tracking-widest text-slate-500">O que aconteceu recentemente</p><h3 className="mb-4 mt-2 font-semibold text-brand-900">Últimos movimentos</h3><ActivityTimeline events={events} /><p className="mt-4 border-t pt-3 text-[11px] text-slate-500">O histórico completo está disponível no separador Histórico e anexos.</p></section>
  </section>;
}
