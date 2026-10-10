'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ClipboardPenLine, CircleHelp, Layers3, Plus, RefreshCcw, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { createBrandRequest, getMe, fulfilmentLabels, type BrandRequestIntent } from '@/lib/client-api';

const intents = [
  { id: 'quote', title: 'Preciso de um orçamento', description: 'Descreva os materiais e peça uma proposta.', icon: ClipboardPenLine },
  { id: 'catalogue', title: 'Quero um produto do catálogo', description: 'Indique os produtos e as quantidades que pretende.', icon: ShoppingBag },
  { id: 'reorder', title: 'Quero repetir um pedido', description: 'Indique a referência anterior e o que muda. A equipa confirma os detalhes.', icon: RefreshCcw },
  { id: 'campaign', title: 'Tenho um evento ou campanha', description: 'Reúna vários materiais num único pedido.', icon: Layers3 },
  { id: 'guidance', title: 'Preciso de ajuda para escolher', description: 'Conte-nos o objetivo; não precisa de saber os produtos ou quantidades.', icon: CircleHelp },
] as const;
type Material = { key: number; description: string; quantity: string; specifications: string };
const fieldClass = 'mt-2 rounded-xl';

export function BrandRequestWizard() {
  const params = useSearchParams();
  const source = params.get('repetir') || '';
  const initialIntent = source ? 'reorder' : intents.find((item) => item.id === params.get('tipo'))?.id || null;
  const [step, setStep] = useState<1 | 2 | 3>(initialIntent ? 2 : 1);
  const [intent, setIntent] = useState<BrandRequestIntent | null>(initialIntent);
  const [projectName, setProjectName] = useState(source ? `Repetição do pedido ${source}` : '');
  const [sourceReference, setSourceReference] = useState(source);
  const [deadline, setDeadline] = useState('');
  const [fulfilment, setFulfilment] = useState<'pickup' | 'delivery' | 'installation'>('pickup');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [needsDesign, setNeedsDesign] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Material[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [contact, setContact] = useState({ name: '', company: '', email: '', nuit: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdReference, setCreatedReference] = useState('');
  const nextKey = useRef(0);
  const submitting = useRef(false);
  const selected = intents.find((item) => item.id === intent);

  useEffect(() => {
    let active = true;
    getMe().then((user) => {
      if (active) setContact({ name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
        company: user.profile?.company || '', email: user.email, nuit: user.profile?.nuit || '' });
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar o perfil.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function updateItem(key: number, patch: Partial<Material>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }
  function selectFiles(selectedFiles: FileList | null) {
    const next = [...files, ...Array.from(selectedFiles || [])];
    if (next.length > 5 || next.reduce((total, file) => total + file.size, 0) > 3 * 1024 * 1024 || next.some((file) => file.size > 2 * 1024 * 1024)) {
      setError('Use até 5 anexos: 2 MB por ficheiro e 3 MB no total.'); return;
    }
    if (next.some((file) => !/\.(pdf|png|jpe?g|webp|csv|xlsx|docx)$/i.test(file.name))) {
      setError('Use PDF, JPG, PNG, WebP, CSV, XLSX ou DOCX.'); return;
    }
    setFiles(next); setError('');
  }
  function validate() {
    if (!projectName.trim()) return 'Dê um nome ao pedido.';
    if (!items.length && !notes.trim()) return 'Explique a necessidade ou adicione pelo menos um material.';
    if (items.some((item) => !item.description.trim() || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 1000000)) return 'Indique a descrição e uma quantidade inteira para cada material. Se ainda não sabe, retire o material e explique nas observações.';
    if (intent === 'reorder' && !sourceReference.trim()) return 'Indique a referência anterior.';
    return '';
  }
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = validate();
    if (message) { setError(message); return; }
    if (step === 2) { setError(''); setStep(3); return; }
    if (step !== 3 || !intent || loading || !contact.email || submitting.current) return;
    submitting.current = true; setSaving(true); setError('');
    try {
      const quote = await createBrandRequest({ intent, projectName: projectName.trim(), deadline, fulfilment,
        sourceReference: intent === 'reorder' ? sourceReference.trim() : '', needsDesign, urgency, notes: notes.trim(), contact,
        items: items.map((item) => ({ description: item.description.trim(), quantity: Number(item.quantity), specifications: item.specifications.trim() })), files });
      setCreatedReference(quote.reference);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.'); }
    finally { submitting.current = false; setSaving(false); }
  }

  if (createdReference) return <section className="mx-auto max-w-3xl rounded-3xl border border-brand-100 bg-white p-8">
    <Check className="h-10 w-10 text-brand" /><p className="mt-5 text-sm font-semibold text-brand">Pedido recebido · {createdReference}</p>
    <h1 className="mt-2 text-3xl font-semibold text-dark">A equipa MP já tem o seu briefing.</h1>
    <p className="mt-3 text-gray-600">Vamos analisar os materiais e anexos. A proposta e os próximos passos aparecerão neste mesmo pedido. A data pretendida fica sujeita a confirmação.</p>
    <Link href={`/area-cliente/orcamentos/${createdReference}`} className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white">Acompanhar pedido</Link>
  </section>;

  return <div className="space-y-6">
    <header className="rounded-3xl bg-brand-900 p-7 text-white sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">Novo pedido · BrandDesk</p>
      <h1 className="mt-4 text-3xl font-semibold">Conte-nos o que precisa. Nós ajudamos a concretizar.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Explique a necessidade, junte referências e reveja o briefing. A equipa MP confirma preços, especificações e prazos antes da produção.</p>
      <ol className="mt-6 flex flex-wrap gap-4 text-sm" aria-label={`Passo ${step} de 3`}>
        {['Objetivo', 'Detalhes e materiais', 'Rever e enviar'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'font-bold text-white' : 'text-white/60'}>{index + 1}. {label}</li>)}
      </ol>
    </header>
    {error ? <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
    {step === 1 ? <section className="space-y-5">
      <h2 className="text-xl font-semibold">O que pretende fazer?</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{intents.map((option) => { const Icon = option.icon; return <button type="button" key={option.id} aria-pressed={intent === option.id} onClick={() => setIntent(option.id)} className={`rounded-2xl border p-5 text-left focus:outline-none focus:ring-2 focus:ring-brand ${intent === option.id ? 'border-brand bg-brand-50' : 'border-[#dfe7e1] bg-white'}`}>
        <Icon className="h-6 w-6 text-brand" /><span className="mt-4 block font-semibold">{option.title}</span><span className="mt-2 block text-sm leading-6 text-gray-500">{option.description}</span>
      </button>; })}</div>
      <Button disabled={!intent} onClick={() => { setStep(2); setError(''); }} className="gap-2">Continuar <ArrowRight className="h-4 w-4" /></Button>
    </section> : <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="space-y-6 rounded-3xl border border-[#dfe7e1] bg-white p-6">
        <div><h2 className="text-xl font-semibold">{step === 2 ? 'Conte-nos o essencial' : 'Confirme o seu pedido'}</h2><p className="mt-2 text-sm text-gray-500">{selected?.title}</p></div>
        {step === 2 ? <>
          <Button type="button" variant="ghost" onClick={() => setStep(1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Alterar objetivo</Button>
          {intent === 'catalogue' ? <Link href="/catalogo" target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-brand">Explorar catálogo ↗</Link> : null}
          <div><Label htmlFor="project-name">Nome do pedido *</Label><Input id="project-name" required maxLength={255} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex.: Materiais para a conferência anual" className={fieldClass} /></div>
          <div><Label htmlFor="brief-notes">{intent === 'guidance' ? 'O que pretende alcançar?' : 'Contexto e observações'}</Label><Textarea id="brief-notes" rows={5} maxLength={20000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Conte-nos o objetivo, público, local, orçamento disponível ou dúvidas. Não precisa de conhecer os detalhes técnicos." className={fieldClass} /></div>
          <div className="space-y-4"><h3 className="font-semibold">Materiais que já conhece</h3><p className="text-sm text-gray-500">Se ainda não sabe os produtos ou quantidades, explique acima. A equipa ajuda a definir.</p>
            {items.map((item, index) => <fieldset key={item.key} className="space-y-3 rounded-2xl border bg-[#f8faf7] p-4"><legend className="px-2 text-sm font-semibold">Material {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-[1fr_150px]"><div><Label htmlFor={`description-${item.key}`}>Produto ou serviço *</Label><Input id={`description-${item.key}`} required maxLength={255} value={item.description} onChange={(event) => updateItem(item.key, { description: event.target.value })} className={fieldClass} /></div><div><Label htmlFor={`quantity-${item.key}`}>Quantidade *</Label><Input id={`quantity-${item.key}`} type="number" min={1} max={1000000} step={1} required value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} className={fieldClass} /></div></div>
              <div><Label htmlFor={`specifications-${item.key}`}>Medidas, acabamentos ou outras indicações</Label><Textarea id={`specifications-${item.key}`} rows={2} maxLength={2000} value={item.specifications} onChange={(event) => updateItem(item.key, { specifications: event.target.value })} className={fieldClass} /></div>
              <Button type="button" variant="ghost" aria-label={`Remover material ${index + 1}`} onClick={() => setItems((current) => current.filter((line) => line.key !== item.key))}><Trash2 className="mr-2 h-4 w-4" /> Remover</Button>
            </fieldset>)}
            <Button type="button" variant="outline" disabled={items.length >= 50} onClick={() => { const key = nextKey.current++; setItems((current) => [...current, { key, description: '', quantity: '', specifications: '' }]); }}><Plus className="mr-2 h-4 w-4" /> Adicionar material</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="deadline">Data pretendida</Label><Input id="deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={fieldClass} /><p className="mt-2 text-xs text-gray-500">A MP confirma a viabilidade na proposta.</p></div><div><Label htmlFor="fulfilment">Como pretende receber?</Label><Select id="fulfilment" value={fulfilment} onChange={(event) => setFulfilment(event.target.value as typeof fulfilment)} className={fieldClass}>{Object.entries(fulfilmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div></div>
          {intent === 'reorder' ? <div><Label htmlFor="source-reference">Referência anterior *</Label><Input id="source-reference" required maxLength={50} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} className={fieldClass} /><p className="mt-2 text-xs text-gray-500">Indique nas observações o que pretende manter ou alterar. A equipa confirma o trabalho de origem.</p></div> : null}
          <div><Label htmlFor="urgency">Prioridade</Label><Select id="urgency" value={urgency} onChange={(event) => setUrgency(event.target.value as typeof urgency)} className={fieldClass}><option value="normal">Planeada</option><option value="urgent">Urgente</option></Select></div>
          <label className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm"><input type="checkbox" checked={needsDesign} onChange={(event) => setNeedsDesign(event.target.checked)} className="mt-1" />Preciso de apoio com design ou arte final</label>
          <div><Label htmlFor="request-files">Anexos e referências</Label><Input id="request-files" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.docx" onChange={(event) => { selectFiles(event.target.files); event.target.value = ''; }} className={fieldClass} /><p className="mt-2 text-xs text-gray-500">PDF, imagens, tabelas ou documentos. Até 5 ficheiros, 2 MB cada e 3 MB no total. Os anexos ficam privados.</p>
            <ul className="mt-3 space-y-2">{files.map((file, index) => <li key={`${index}-${file.name}`} className="flex items-center justify-between gap-3 text-sm"><span className="break-all">{file.name} · {Math.ceil(file.size / 1024)} KB</span><Button type="button" variant="ghost" aria-label={`Remover anexo ${file.name}`} onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}><Trash2 className="h-4 w-4" /></Button></li>)}</ul>
          </div>
        </> : <>
          <h3 className="font-semibold">{projectName}</h3><p className="whitespace-pre-wrap text-sm text-gray-600">{notes || 'Sem observações adicionais.'}</p>
          {items.length ? <ul className="divide-y">{items.map((item) => <li key={item.key} className="py-4"><p className="font-medium">{item.description} · {item.quantity} unidades</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-500">{item.specifications || 'Especificações a confirmar pela MP.'}</p></li>)}</ul> : <p className="rounded-xl bg-brand-50 p-4 text-sm">A equipa ajudará a definir os materiais e quantidades. Não serão assumidos valores.</p>}
          <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-gray-500">Data pretendida</dt><dd>{deadline || 'A combinar'} · sujeita a confirmação</dd></div><div><dt className="text-gray-500">Recepção</dt><dd>{fulfilmentLabels[fulfilment]}</dd></div><div><dt className="text-gray-500">Design</dt><dd>{needsDesign ? 'Solicitado' : 'Não solicitado'}</dd></div><div><dt className="text-gray-500">Prioridade</dt><dd>{urgency === 'urgent' ? 'Urgente' : 'Planeada'}</dd></div>{intent === 'reorder' ? <div><dt>Referência anterior</dt><dd>{sourceReference}</dd></div> : null}</dl>
          <div><h3 className="font-semibold">Anexos ({files.length})</h3><ul className="mt-2 space-y-2 text-sm">{files.map((file, index) => <li key={index} className="break-all">{file.name} · {Math.ceil(file.size / 1024)} KB</li>)}</ul></div>
          <Button type="button" variant="outline" disabled={saving} onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" />Editar briefing</Button>
          <p className="rounded-xl bg-[#f4f0e8] p-4 text-sm">Está a enviar um pedido de análise, não uma encomenda confirmada. Receberá uma proposta para aprovar antes da produção.</p>
        </>}
      </section>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start"><div className="rounded-3xl border bg-white p-5"><h2 className="font-semibold">Pedido em nome de</h2>{loading ? <p className="mt-3 text-sm">A carregar perfil...</p> : <div className="mt-3 space-y-2 text-sm"><p className="font-medium">{contact.company || contact.name}</p><p className="break-all text-gray-500">{contact.email}</p><p className="text-gray-500">NUIT: {contact.nuit || 'Não indicado'}</p><Link href="/area-cliente/perfil" target="_blank" rel="noopener noreferrer" className="text-brand">Consultar perfil da empresa ↗</Link></div>}</div>
        <p className="rounded-2xl bg-[#f4f0e8] p-5 text-sm leading-6">A equipa analisa o briefing, prepara a proposta e pede a sua aprovação. Pode acompanhar tudo no mesmo pedido.</p>
        <Button type="submit" disabled={saving || loading || !contact.email} className="h-12 w-full gap-2">{saving ? 'A enviar...' : step === 2 ? 'Rever pedido' : 'Enviar pedido'}<ArrowRight className="h-4 w-4" /></Button>
        <p className="text-xs text-gray-500">Os dados mantêm-se ao voltar aos passos anteriores. Os ficheiros só são enviados quando confirma.</p>
      </aside>
    </form>}
  </div>;
}
