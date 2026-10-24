'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrandAssets } from '@/lib/client-api';
import type { BrandAsset } from '@/lib/api';
import { BrandLibraryFileLink } from './BrandLibraryFile';

export function BrandLibraryPicker({ selected, onChange, initialId, disabled = false }: {
  selected: BrandAsset[]; onChange: (assets: BrandAsset[]) => void; initialId?: string; disabled?: boolean;
}) {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [open, setOpen] = useState(Boolean(initialId));
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open || loaded) return;
    let active = true; setLoading(true); setError('');
    getBrandAssets().then((rows) => { if (active) { setAssets(rows); setLoaded(true); } })
      .catch(() => { if (active) setError('Não foi possível abrir a Biblioteca. Tente novamente ou carregue uma referência.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, loaded, retry]);
  const initial = initialId && assets.find((asset) => String(asset.id) === initialId);
  function toggle(asset: BrandAsset) {
    const next = selected.some((item) => item.id === asset.id) ? selected.filter((item) => item.id !== asset.id) : [...selected, asset];
    if (next.length > 5 || next.reduce((sum, item) => sum + (item.file_size || 0), 0) > 20 * 1024 * 1024) { setError('Selecione até 5 materiais e 20 MB da Biblioteca.'); return; }
    setError(''); onChange(next);
  }
  return <section className="space-y-4 rounded-2xl border border-brand-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-brand-900">Usar materiais da sua marca</h3><p className="mt-1 text-sm text-slate-500">Escolha logótipos e artes já guardados, sem os voltar a carregar.</p></div><button type="button" disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-xl border px-4 py-2 text-sm font-semibold">{open ? 'Fechar Biblioteca' : 'Escolher da Biblioteca'}</button></div>
    {selected.length ? <p className="text-sm text-brand-800" role="status">{selected.length} material(is) selecionado(s): {selected.map((asset) => asset.name).join(', ')}</p> : null}
    {open ? <fieldset disabled={disabled || loading} className="space-y-3"><legend className="sr-only">Materiais da Biblioteca</legend>{loading ? <p role="status" className="text-sm">A carregar Biblioteca…</p> : null}
      {loaded ? <><label className="block text-sm">Pesquisar materiais<input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>
      {initial && !selected.some((asset) => asset.id === initial.id) ? <button type="button" onClick={() => toggle(initial)} className="rounded-xl bg-brand-800 px-4 py-2 text-sm text-white">Usar {initial.name} neste pedido</button> : null}
      {!assets.length ? <p className="text-sm text-slate-500">A Biblioteca ainda está vazia. Pode carregar um ficheiro abaixo ou <Link href="/area-cliente/marca" className="underline">organizar os seus materiais</Link>.</p> : null}
      <ul className="max-h-80 space-y-2 overflow-auto">{assets.filter((asset) => `${asset.name} ${asset.kind_display || asset.kind}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((asset) => <li key={asset.id} className="rounded-xl border bg-[#f8faf6] p-3"><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={selected.some((item) => item.id === asset.id)} onChange={() => toggle(asset)} className="mt-1" /><span><span className="font-semibold">{asset.name}</span><span className="mt-1 block text-xs text-slate-500">{asset.kind_display || asset.kind} · {Math.ceil((asset.file_size || 0) / 1024)} KB</span><span className="mt-1 block text-xs text-brand-800">{asset.approval_record?.quote_reference ? `Aprovada no pedido ${asset.approval_record.quote_reference} · v${asset.approval_record.version}` : 'Material fornecido pelo cliente · sem aprovação de aplicação'}</span></span></label><BrandLibraryFileLink url={asset.file} filename={asset.file_name || asset.name} className="ml-7 mt-2 text-xs underline">Consultar ficheiro</BrandLibraryFileLink></li>)}</ul></> : null}</fieldset> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error} {!loaded ? <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">Tentar novamente</button> : null}</p> : null}
    <p className="text-xs leading-5 text-slate-500">Guardamos a versão escolhida neste pedido, mesmo se remover o original da Biblioteca. Uma arte aprovada noutro trabalho não aprova automaticamente esta nova aplicação.</p>
  </section>;
}
