'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileCheck2,
  ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { getClientQuotes } from '@/lib/client-api';
import type { Quote } from '@/lib/api';
import { formatMZN } from '@/lib/utils';

type ApprovalItem = {
  key: string;
  reference: string;
  title: string;
  description: string;
  type: 'price' | 'artwork';
  href: string;
  date: string;
};

function buildApprovalItems(quotes: Quote[]): ApprovalItem[] {
  return quotes.flatMap((quote) => {
    const items: ApprovalItem[] = [];
    const label = quote.items?.[0]?.description || 'Projeto de marca';
    if (quote.status === 'quoted' && !quote.price_approved_at) {
      items.push({
        key: `price-${quote.id}`,
        reference: quote.reference,
        title: 'Aprovar proposta comercial',
        description: quote.final_price
          ? `${label} · ${formatMZN(quote.final_price)}`
          : `${label} · proposta pronta para revisão`,
        type: 'price',
        href: `/area-cliente/orcamentos/${quote.reference}`,
        date: quote.updated_at || quote.created_at,
      });
    }
    if (quote.artwork?.status === 'pending' && quote.status !== 'cancelled') {
      items.push({
        key: `artwork-${quote.id}`,
        reference: quote.reference,
        title: 'Rever prova de arte',
        description: `${label} · confirme os detalhes antes da produção`,
        type: 'artwork',
        href: `/area-cliente/orcamentos/${quote.reference}`,
        date: quote.artwork.updated_at || quote.updated_at || quote.created_at,
      });
    }
    return items;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function ClientApprovalsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadApprovals() {
    setLoading(true);
    setError('');
    getClientQuotes()
      .then(setQuotes)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as aprovações.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadApprovals();
  }, []);

  const approvals = useMemo(() => buildApprovalItems(quotes), [quotes]);
  const priceCount = approvals.filter((item) => item.type === 'price').length;
  const artworkCount = approvals.length - priceCount;

  if (loading) {
    return <div className="h-72 animate-pulse rounded-3xl bg-[#e2e9e3]" aria-label="A carregar aprovações" />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button type="button" onClick={loadApprovals} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-[#dfe7e1] bg-white p-6 shadow-[0_22px_60px_-48px_rgba(6,63,43,0.6)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              <BadgeCheck className="h-3.5 w-3.5" />
              Centro de decisões
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-dark sm:text-4xl">
              O que precisa da sua aprovação.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#68776f] sm:text-base">
              Propostas e provas de arte ficam reunidas aqui para que nenhuma decisão se perca em mensagens.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
            <div className="rounded-2xl bg-[#f4f0e8] p-4">
              <p className="text-2xl font-semibold text-dark">{priceCount}</p>
              <p className="mt-1 text-xs text-[#7a705f]">propostas</p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-2xl font-semibold text-brand-900">{artworkCount}</p>
              <p className="mt-1 text-xs text-brand-700">provas de arte</p>
            </div>
          </div>
        </div>
      </section>

      {approvals.length === 0 ? (
        <section className="rounded-3xl border border-[#dfe7e1] bg-white px-6 py-14 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-dark">Tudo aprovado por agora</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718078]">
            Quando a equipa enviar uma proposta ou prova para confirmar, aparecerá neste espaço.
          </p>
          <Link href="/area-cliente/novo-pedido" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
            Iniciar novo pedido
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section className="space-y-3" aria-label="Aprovações pendentes">
          {approvals.map((approval) => {
            const Icon = approval.type === 'price' ? FileCheck2 : ImageIcon;
            return (
              <Link key={approval.key} href={approval.href} className="group block">
                <article className="flex flex-col gap-5 rounded-2xl border border-[#dfe7e1] bg-white p-5 shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)] transition group-hover:-translate-y-0.5 group-hover:border-brand-200 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${approval.type === 'price' ? 'bg-[#f4f0e8] text-[#967036]' : 'bg-brand-50 text-brand-700'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-brand-700">{approval.reference}</span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700 ring-1 ring-inset ring-amber-200">Decisão necessária</span>
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-dark">{approval.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[#718078]">{approval.description}</p>
                    </div>
                  </div>
                  <span className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
                    Rever
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </article>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
