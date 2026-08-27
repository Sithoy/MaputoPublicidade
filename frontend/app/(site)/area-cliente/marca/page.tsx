'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Download,
  FileImage,
  FolderOpen,
  LibraryBig,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { getClientOrders, getClientQuotes } from '@/lib/client-api';
import type { Order, Quote } from '@/lib/api';

type BrandAsset = {
  url: string;
  name: string;
  kind: 'source' | 'approved';
  reference: string;
  updatedAt: string;
};

function fileNameFromUrl(url: string) {
  const cleanUrl = url.split('?')[0];
  return decodeURIComponent(cleanUrl.split('/').pop() || 'Ficheiro da marca');
}

function buildBrandAssets(quotes: Quote[], orders: Order[]) {
  const assets = new Map<string, BrandAsset>();

  function addAsset(asset: BrandAsset) {
    if (!assets.has(asset.url)) assets.set(asset.url, asset);
  }

  for (const quote of quotes) {
    for (const item of quote.items || []) {
      if (item.artwork_file) {
        addAsset({
          url: item.artwork_file,
          name: fileNameFromUrl(item.artwork_file),
          kind: 'source',
          reference: quote.reference,
          updatedAt: item.created_at || quote.created_at,
        });
      }
    }
    if (quote.artwork?.status === 'approved' && quote.artwork.proof_file) {
      addAsset({
        url: quote.artwork.proof_file,
        name: fileNameFromUrl(quote.artwork.proof_file),
        kind: 'approved',
        reference: quote.reference,
        updatedAt: quote.artwork.approved_at || quote.updated_at || quote.created_at,
      });
    }
  }

  for (const order of orders) {
    for (const item of order.items || []) {
      if (item.artwork_file) {
        addAsset({
          url: item.artwork_file,
          name: fileNameFromUrl(item.artwork_file),
          kind: 'source',
          reference: order.reference,
          updatedAt: item.created_at || order.created_at,
        });
      }
    }
    if (order.artwork?.status === 'approved' && order.artwork.proof_file) {
      addAsset({
        url: order.artwork.proof_file,
        name: fileNameFromUrl(order.artwork.proof_file),
        kind: 'approved',
        reference: order.reference,
        updatedAt: order.artwork.approved_at || order.updated_at || order.created_at,
      });
    }
  }

  return Array.from(assets.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export default function BrandLibraryPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadAssets() {
    setLoading(true);
    setError('');
    Promise.all([getClientQuotes(), getClientOrders()])
      .then(([quoteData, orderData]) => {
        setQuotes(quoteData);
        setOrders(orderData);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os ficheiros.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAssets();
  }, []);

  const assets = useMemo(() => buildBrandAssets(quotes, orders), [quotes, orders]);
  const approvedCount = assets.filter((asset) => asset.kind === 'approved').length;

  if (loading) {
    return <div className="h-72 animate-pulse rounded-3xl bg-[#e2e9e3]" aria-label="A carregar biblioteca da marca" />;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] bg-brand-900 px-6 py-9 text-white sm:px-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[46px] border-white/[0.035]" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-100 ring-1 ring-white/10">
              <LibraryBig className="h-3.5 w-3.5" />
              Memória da sua marca
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Materiais aprovados, sempre à mão.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/68 sm:text-base">
              Reencontre ficheiros enviados e artes aprovadas para acelerar o próximo trabalho.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="min-w-28 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
              <p className="text-2xl font-semibold">{assets.length}</p>
              <p className="mt-1 text-xs text-white/60">ficheiros</p>
            </div>
            <div className="min-w-28 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
              <p className="text-2xl font-semibold">{approvedCount}</p>
              <p className="mt-1 text-xs text-white/60">aprovados</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          <div className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <button type="button" onClick={loadAssets} className="inline-flex shrink-0 items-center gap-2 font-semibold">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      ) : null}

      {assets.length === 0 && !error ? (
        <section className="rounded-3xl border border-[#dfe7e1] bg-white px-6 py-14 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <FolderOpen className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-dark">A biblioteca cresce com os seus projetos</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#718078]">
            Ficheiros enviados e provas aprovadas passarão a aparecer aqui automaticamente.
          </p>
          <Link href="/area-cliente/novo-pedido" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
            Criar primeiro projeto
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : null}

      {assets.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Biblioteca</p>
              <h2 className="mt-1 text-xl font-semibold text-dark">Ficheiros da sua empresa</h2>
            </div>
            <Link href="/area-cliente/novo-pedido" className="hidden items-center gap-2 text-sm font-semibold text-brand-700 sm:inline-flex">
              Usar num novo pedido
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <article key={asset.url} className="rounded-2xl border border-[#dfe7e1] bg-white p-5 shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
                <div className="flex items-start justify-between gap-4">
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${asset.kind === 'approved' ? 'bg-brand-50 text-brand-700' : 'bg-[#f4f0e8] text-[#967036]'}`}>
                    {asset.kind === 'approved' ? <ShieldCheck className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${asset.kind === 'approved' ? 'bg-brand-50 text-brand-700' : 'bg-[#f4f0e8] text-[#8d7040]'}`}>
                    {asset.kind === 'approved' ? 'Aprovado' : 'Original'}
                  </span>
                </div>
                <h3 className="mt-5 truncate text-sm font-semibold text-dark" title={asset.name}>{asset.name}</h3>
                <p className="mt-1 font-mono text-[11px] font-semibold text-[#829087]">{asset.reference}</p>
                <a href={asset.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#d7e1da] text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
                  <Download className="h-4 w-4" />
                  Abrir ficheiro
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
