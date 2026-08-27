'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Download,
  FileImage,
  FileText,
  FolderOpen,
  LibraryBig,
  Palette,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  deleteBrandAsset,
  getBrandAssets,
  getClientOrders,
  getClientQuotes,
  uploadBrandAsset,
} from '@/lib/client-api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { BrandAsset as ManagedAsset, Order, Quote } from '@/lib/api';

const kindOptions = [
  { value: 'logo', label: 'Logótipo' },
  { value: 'artwork', label: 'Arte aprovada' },
  { value: 'template', label: 'Modelo reutilizável' },
  { value: 'guide', label: 'Guia de marca' },
  { value: 'document', label: 'Documento' },
  { value: 'other', label: 'Outro' },
];

function isImage(file: string) {
  return /\.(png|jpe?g|svg|webp|gif)$/i.test(file);
}

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
  const [managedAssets, setManagedAssets] = useState<ManagedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('logo');
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [brandColors, setBrandColors] = useState('');

  const loadAssets = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([getClientQuotes(), getClientOrders(), getBrandAssets()])
      .then(([quoteData, orderData, assetData]) => {
        setQuotes(quoteData);
        setOrders(orderData);
        setManagedAssets(assetData);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os ficheiros.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await uploadBrandAsset({
        name: name.trim(),
        kind,
        file,
        description: description.trim() || undefined,
        brand_colors: brandColors.trim() || undefined,
      });
      setName('');
      setKind('logo');
      setFile(null);
      setDescription('');
      setBrandColors('');
      setShowForm(false);
      loadAssets();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível carregar o ficheiro.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(asset: ManagedAsset) {
    if (!window.confirm(`Remover "${asset.name}" dos materiais de marca?`)) return;
    try {
      await deleteBrandAsset(asset.id);
      setManagedAssets((current) => current.filter((item) => item.id !== asset.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível remover.');
    }
  }

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

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Materiais guardados</p>
            <h2 className="mt-1 text-xl font-semibold text-dark">Logótipos e ficheiros da marca</h2>
            <p className="mt-1 text-sm text-[#718078]">
              Guarde uma vez — a equipa MP reutiliza em cada trabalho.
            </p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)} className="gap-2 self-start">
            <Plus className="h-4 w-4" />
            Adicionar material
          </Button>
        </div>

        {showForm ? (
          <Card className="mb-4">
            <CardContent className="p-5">
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="asset-name">Nome *</Label>
                    <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Logótipo principal" className="mt-1" required />
                  </div>
                  <div>
                    <Label htmlFor="asset-kind">Tipo</Label>
                    <Select id="asset-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1">
                      {kindOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="asset-file">Ficheiro *</Label>
                    <Input id="asset-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1" required />
                  </div>
                  <div>
                    <Label htmlFor="asset-colors">Cores da marca (opcional)</Label>
                    <Input id="asset-colors" value={brandColors} onChange={(e) => setBrandColors(e.target.value)} placeholder="#063F2B, #F4F0E8" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="asset-description">Descrição (opcional)</Label>
                  <Textarea id="asset-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
                </div>
                <Button type="submit" disabled={saving || !file || !name.trim()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {saving ? 'A enviar...' : 'Guardar material'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {managedAssets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#d7e1da] bg-white/60 px-5 py-6 text-sm text-[#718078]">
            Ainda não guardou materiais. Adicione o seu logótipo para não precisar de o reenviar.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {managedAssets.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-2xl border border-[#dfe7e1] bg-white shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
                {isImage(asset.file) ? (
                  <div className="flex h-32 items-center justify-center bg-[#f4f7f4] p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.file} alt={asset.name} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center bg-[#f4f7f4] text-[#829087]">
                    {asset.kind === 'document' ? <FileText className="h-10 w-10" /> : <Palette className="h-10 w-10" />}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-dark" title={asset.name}>{asset.name}</h3>
                      <p className="mt-0.5 text-xs text-[#829087]">{asset.kind_display || asset.kind}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <a
                        href={asset.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64736b] transition hover:bg-brand-50 hover:text-brand-700"
                        aria-label={`Descarregar ${asset.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleDelete(asset)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64736b] transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remover ${asset.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {asset.brand_colors ? (
                    <div className="mt-3 flex items-center gap-1.5">
                      {asset.brand_colors.split(',').map((color) => color.trim()).filter(Boolean).map((color) => (
                        <span
                          key={color}
                          title={color}
                          className="h-5 w-5 rounded-md border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {asset.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#718078]">{asset.description}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
