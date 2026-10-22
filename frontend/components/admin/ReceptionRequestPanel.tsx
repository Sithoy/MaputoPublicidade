'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Plus, Trash2 } from 'lucide-react';
import { BriefingDisclosure } from '@/components/BriefingDisclosure';
import { MaterialBriefingFields } from '@/components/MaterialBriefingFields';
import { downloadRequestAttachment } from '@/lib/client-api';
import { type ReceptionBriefing, type ReceptionItem, type ReceptionRequest, updateReception } from '@/lib/reception-api';

type ItemDraft = Omit<ReceptionItem, 'quantity'> & { quantity: string; key: string };
function initialBriefing(request: ReceptionRequest): ReceptionBriefing {
  return request.briefing || { project_name: '', description: request.notes || '', deadline: request.deadline || null,
    fulfilment: '', delivery_address: '', source_reference: '', needs_design: false, questions: '' };
}
function itemDraft(item: ReceptionItem, index: number): ItemDraft {
  return { ...item, key: item.id ? `item-${item.id}` : `initial-${index}`, quantity: String(item.quantity),
    size: item.size || '', material: item.material || '', colors: item.colors || '',
    specifications: item.specifications || '', needs_design: item.needs_design || false,
    ...(item.material_briefing ? { material_briefing: item.material_briefing } : {}) };
}
function itemPayload(item: ItemDraft): ReceptionItem {
  return { ...(item.id ? { id: item.id } : {}), description: item.description, quantity: Number(item.quantity),
    size: item.size || '', material: item.material || '', colors: item.colors || '',
    specifications: item.specifications || '', needs_design: item.needs_design || false,
    ...(item.material_briefing ? { material_briefing: item.material_briefing } : {}) };
}

export function ReceptionRequestPanel({ request, userId, canReleaseOthers = false, embedded = false, editingAllowed, onChange, onClose }: {
  request: ReceptionRequest; userId: number; canReleaseOthers?: boolean; embedded?: boolean;
  editingAllowed?: boolean; onChange: (request: ReceptionRequest | null) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ client_name: request.client_name, client_email: request.client_email,
    client_phone: request.client_phone, client_nuit: request.client_nuit, reception_notes: request.reception_notes });
  const [briefing, setBriefing] = useState<ReceptionBriefing>(() => initialBriefing(request));
  const [items, setItems] = useState<ItemDraft[]>(() => request.items.map(itemDraft));
  const [files, setFiles] = useState<File[]>([]);
  const counter = useRef(0);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const owns = editingAllowed ?? request.reception_owner === userId;
  const disabled = !owns || busy;
  const missing = request.missing_information || [];
  const dirty = Object.entries(form).some(([key, value]) => value !== request[key as keyof ReceptionRequest])
    || JSON.stringify(briefing) !== JSON.stringify(initialBriefing(request))
    || JSON.stringify(items.map(itemPayload)) !== JSON.stringify(request.items.map((item, index) => itemPayload(itemDraft(item, index))))
    || files.length > 0;

  async function perform(action: 'claim' | 'handoff' | 'edit' | 'release') {
    setBusy(true); setError(''); setSaved('');
    try {
      const payload = action === 'edit' ? { ...form, briefing, items: items.map(itemPayload) } : {};
      const updated = files.length && action === 'edit'
        ? await updateReception(request.reference, action, payload, files)
        : await updateReception(request.reference, action, payload);
      if (action === 'edit') {
        setForm({ client_name: updated.client_name, client_email: updated.client_email,
          client_phone: updated.client_phone, client_nuit: updated.client_nuit, reception_notes: updated.reception_notes });
        setBriefing(initialBriefing(updated)); setItems(updated.items.map(itemDraft)); setFiles([]);
        setSaved('Briefing e referências guardados no mesmo pedido.');
      }
      onChange(action === 'handoff' ? null : updated);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível guardar.'); }
    finally { setBusy(false); }
  }

  function save(event: FormEvent) { event.preventDefault(); void perform('edit'); }
  function changeItem(key: string, values: Partial<ItemDraft>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...values } : item));
  }
  function addFiles(selected: File[]) {
    const combined = [...files, ...selected];
    const existing = (request.attachments || []).filter((file) => file.is_internal);
    if (existing.length + combined.length > 5 || existing.reduce((total, file) => total + file.size, 0) + combined.reduce((total, file) => total + file.size, 0) > 3 * 1024 * 1024 || combined.some((file) => file.size > 2 * 1024 * 1024)) {
      setError('Use até 5 referências internas, 3 MB no total e 2 MB por ficheiro.'); return;
    }
    setError(''); setFiles(combined);
  }
  async function download(file: NonNullable<ReceptionRequest['attachments']>[number]) {
    setDownloading(file.id); setError('');
    try { await downloadRequestAttachment(request.reference, file.id, file.name); }
    catch { setError('Não foi possível descarregar o anexo.'); }
    finally { setDownloading(null); }
  }
  const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm disabled:bg-slate-50';

  return <section aria-label={`Triagem ${request.reference}`} className="rounded-2xl border border-brand-200 bg-white p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Completar briefing</p><h2 className="mt-1 text-xl font-semibold">{request.reference}</h2></div>
      <button type="button" disabled={busy} onClick={() => { if (!dirty || window.confirm('Sair sem guardar as alterações?')) onClose(); }} className="rounded-lg border px-3 py-2 text-sm">Fechar</button></div>
    <p className="mt-3 text-sm text-slate-600">Pedido partilhado pela Recepção. As alterações ficam registadas por quem as realizou.</p>
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {saved && <p role="status" className="mt-3 text-sm text-brand-700">{saved}</p>}
    {editingAllowed === undefined && !request.reception_owner && <button type="button" disabled={busy} onClick={() => perform('claim')} className="mt-4 rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white">Assumir atendimento</button>}
    {editingAllowed === undefined && request.reception_owner && !owns && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Este atendimento está a ser tratado por outra pessoa.</p>}
    {editingAllowed === undefined && request.reception_owner && (owns || canReleaseOthers) && <button type="button" disabled={busy || dirty} onClick={() => { if (window.confirm('Devolver este atendimento à fila para outra pessoa assumir?')) void perform('release'); }} className="mt-3 text-sm text-slate-600 underline">Devolver à fila</button>}
    <details className="my-5 rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold">Consultar mensagem original do cliente</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">{request.notes || 'Sem mensagem adicional.'}</p>{!embedded ? <Link href={`/admin/orcamentos/${encodeURIComponent(request.reference)}`} className="mt-3 inline-block text-sm font-semibold text-brand-700">Abrir pedido completo →</Link> : null}</details>
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 space-y-6">
      <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-[#dfe7e1] p-4 sm:p-5"><legend className="px-2 font-semibold">1. Cliente e contacto</legend>
        <div className="grid gap-4 sm:grid-cols-2">{([
          ['client_name', 'Cliente / empresa', 'text'],
          ['client_email', 'E-mail', 'email'], ['client_phone', 'Telefone', 'tel'],
        ] as const).map(([key, label, type]) => <label key={key} className="text-sm font-medium">{label}<input type={type} required={key === 'client_name'} maxLength={key === 'client_name' ? 255 : key === 'client_email' ? 254 : 50} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className={inputClass} /></label>)}</div>
        <BriefingDisclosure title="Dados de faturação" hint="Opcional na triagem; útil ao preparar a proposta." defaultOpen={Boolean(form.client_nuit)}>
          <label className="block text-sm font-medium">NUIT<input maxLength={50} value={form.client_nuit} onChange={(event) => setForm((current) => ({ ...current, client_nuit: event.target.value }))} className={inputClass} /></label>
        </BriefingDisclosure>
      </fieldset>
      <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-[#dfe7e1] p-4 sm:p-5"><legend className="px-2 font-semibold">2. Necessidade e entrega pretendida</legend>
        <label className="block text-sm font-medium">Nome do projeto<input maxLength={255} value={briefing.project_name} onChange={(event) => setBriefing((current) => ({ ...current, project_name: event.target.value }))} className={inputClass} placeholder="Ex.: Materiais para a inauguração" /></label>
        <label className="block text-sm font-medium">Descrição da necessidade<textarea rows={4} maxLength={20000} value={briefing.description} onChange={(event) => setBriefing((current) => ({ ...current, description: event.target.value }))} className={inputClass} placeholder="Complete o que o cliente pretende e onde vai utilizar os materiais…" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Data pretendida<input type="date" value={briefing.deadline || ''} onChange={(event) => setBriefing((current) => ({ ...current, deadline: event.target.value || null }))} className={inputClass} /></label>
          <div className="rounded-xl border p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={briefing.fulfilment === 'delivery' || briefing.fulfilment === 'installation'} onChange={(event) => setBriefing((current) => ({ ...current, fulfilment: event.target.checked ? 'delivery' : 'pickup' }))} />O cliente precisa de entrega</label><p className="mt-2 text-xs text-slate-500">{briefing.fulfilment === 'installation' ? 'Entrega e instalação registadas anteriormente. Confirme também o contexto de cada material.' : 'Sem entrega: levantamento na MP. Instalação e visita são indicadas por material.'}</p></div></div>
        <p className="text-xs text-slate-500">A data é uma preferência do cliente, não uma promessa de entrega nem o prazo comercial.</p>
        {(briefing.fulfilment === 'delivery' || briefing.fulfilment === 'installation' || briefing.delivery_address) && <label className="block text-sm font-medium">Local / endereço de entrega<textarea rows={2} maxLength={2000} value={briefing.delivery_address} onChange={(event) => setBriefing((current) => ({ ...current, delivery_address: event.target.value }))} className={inputClass} /></label>}
        <BriefingDisclosure title="Relacionar trabalho anterior" hint="Abra apenas se este pedido repetir ou alterar um trabalho." defaultOpen={Boolean(briefing.source_reference)}>
          <label className="block text-sm font-medium">Referência de trabalho anterior<input maxLength={50} value={briefing.source_reference} onChange={(event) => setBriefing((current) => ({ ...current, source_reference: event.target.value }))} className={inputClass} /></label>
        </BriefingDisclosure>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={briefing.needs_design} onChange={(event) => setBriefing((current) => ({ ...current, needs_design: event.target.checked }))} />O cliente precisa de apoio de design</label>
      </fieldset>
      <fieldset disabled={disabled} className="space-y-4 rounded-2xl border border-[#dfe7e1] p-4 sm:p-5"><legend className="px-2 font-semibold">3. Materiais e especificações</legend>
        <p className="text-xs leading-5 text-slate-500">Não invente quantidades. Se ainda não forem conhecidas, descreva a necessidade e registe a dúvida abaixo. Os materiais já recebidos são mantidos; indique nas dúvidas se algum deve ser excluído.</p>
        {items.map((item, index) => <div key={item.key} className="space-y-3 rounded-2xl border bg-slate-50/70 p-4"><div className="flex justify-between gap-3"><h3 className="text-sm font-semibold">Material {index + 1}</h3>{!item.id && <button type="button" onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))} className="inline-flex items-center gap-1 text-xs text-red-700"><Trash2 className="h-3 w-3" />Remover material {index + 1}</button>}</div>
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]"><label className="text-sm">Descrição do material {index + 1}<input required maxLength={510} value={item.description} onChange={(event) => changeItem(item.key, { description: event.target.value })} className={inputClass} /></label><label className="text-sm">Quantidade do material {index + 1}<input required type="number" min={1} max={1000000} step={1} value={item.quantity} onChange={(event) => changeItem(item.key, { quantity: event.target.value })} className={inputClass} /></label></div>
          <MaterialBriefingFields quantity={Number(item.quantity)} id={`reception-${item.key}`} value={item.material_briefing} onChange={(value) => changeItem(item.key, { material_briefing: value })} />
          <label className="block text-sm">Descrição livre e referências do material {index + 1}<textarea rows={3} maxLength={2000} value={item.specifications || ''} onChange={(event) => changeItem(item.key, { specifications: event.target.value })} className={inputClass} placeholder="Descreva o que importa para este material. Fotografias e exemplos podem complementar o texto." /></label>
          <BriefingDisclosure title={`Detalhes técnicos do material ${index + 1}`} hint="Apenas indicações adicionais já conhecidas; não é necessário preencher tudo." defaultOpen={Boolean(item.size || item.material || item.colors || item.needs_design)}>
          <div className="grid gap-3 sm:grid-cols-3">{([['size', 'Dimensões'], ['material', 'Material / acabamento'], ['colors', 'Cores']] as const).filter(([key]) => key !== 'size' || Boolean(item.size)).map(([key, label]) => <label key={key} className="text-sm">{label} {index + 1}<input maxLength={100} value={item[key] || ''} onChange={(event) => changeItem(item.key, { [key]: event.target.value })} className={inputClass} /></label>)}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.needs_design || false} onChange={(event) => changeItem(item.key, { needs_design: event.target.checked })} />Precisa de design para este material</label>
          </BriefingDisclosure>
        </div>)}
        <button type="button" disabled={items.length >= 50 || disabled} onClick={() => { counter.current += 1; setItems((current) => [...current, { key: `new-${counter.current}`, description: '', quantity: '', needs_design: briefing.needs_design }]); }} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"><Plus className="h-4 w-4" />Adicionar material</button>
      </fieldset>
      <fieldset disabled={disabled}>
        <legend className="sr-only">4. Referências e dúvidas</legend>
        <BriefingDisclosure title="Referências, dúvidas e notas internas" hint="Acrescente apenas o que ajuda a equipa Comercial." defaultOpen={Boolean(briefing.questions || form.reception_notes || files.length || request.attachments?.length)}>
        <p className="text-xs text-slate-500">Os novos anexos são internos: não são publicados no BrandDesk do cliente. Até 5 referências internas, 3 MB no total e 2 MB por ficheiro.</p>
        <label className="block text-sm font-medium">Adicionar referências internas<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.docx" onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label>
        {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex justify-between gap-3 rounded-xl bg-brand-50 p-3 text-sm"><span className="break-all">{file.name} · por guardar</span><button type="button" onClick={() => setFiles((current) => current.filter((_, position) => position !== index))} aria-label={`Remover anexo ${file.name}`}>Remover</button></div>)}
        <label className="block text-sm font-medium">Dúvidas por confirmar<textarea rows={3} maxLength={4000} value={briefing.questions} onChange={(event) => setBriefing((current) => ({ ...current, questions: event.target.value }))} className={inputClass} placeholder="Ex.: Quantidade final, tipo de material, arte ou endereço ainda por confirmar…" /></label>
        <label className="block text-sm font-medium">Notas internas para o Comercial<textarea rows={3} maxLength={10000} value={form.reception_notes} onChange={(event) => setForm((current) => ({ ...current, reception_notes: event.target.value }))} className={inputClass} /></label>
        </BriefingDisclosure>
      </fieldset>
      {(request.attachments || []).length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold">Anexos guardados</h3>{request.attachments?.map((file) => <div key={file.id} className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="break-all">{file.name} · {file.is_internal ? 'Interno' : 'Enviado pelo cliente'}</span><button type="button" disabled={downloading !== null} onClick={() => download(file)} className="inline-flex items-center gap-1 text-brand-700"><Download className="h-4 w-4" />Descarregar</button></div>)}</div>}
      </div>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start" aria-label="Resumo da triagem">
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Próximo passo</p>
          <h3 className="mt-2 font-semibold text-brand-900">{dirty ? 'Guardar para validar' : missing.length ? 'Completar informação' : 'Pronto para preparar a proposta'}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-600">{dirty ? 'Existem alterações por guardar. O sistema confirma a informação necessária depois de guardar.' : 'A Receção prepara a proposta neste pedido. O Comercial revê e aprova antes do envio ao cliente.'}</p>
          <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-slate-500">Cliente</dt><dd className="mt-1 break-words font-medium">{form.client_name || 'A confirmar'}</dd></div><div><dt className="text-slate-500">Materiais registados</dt><dd className="mt-1 font-medium">{items.length || 'A definir com o cliente'}</dd></div></dl>
          {missing.length > 0 && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><p className="font-semibold">Por completar{dirty ? ' na última versão guardada' : ''}</p><ul className="mt-2 list-disc space-y-1 pl-4">{missing.map((value) => <li key={value}>{value}</li>)}</ul></div>}
        </div>
      {owns && <div className="flex flex-col gap-3"><button disabled={busy || !dirty} className="rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50">Guardar triagem</button><button type="button" disabled={busy || dirty || missing.length > 0} onClick={() => perform('handoff')} className="rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50">Concluir triagem</button>{!embedded ? <Link href={`/admin/orcamentos/${request.reference}/proposta`} aria-disabled={busy || dirty || missing.length > 0} onClick={(event) => { if (busy || dirty || missing.length > 0) event.preventDefault(); }} className="rounded-xl bg-brand-800 px-4 py-3 text-center text-sm font-semibold text-white">Preparar proposta neste pedido</Link> : null}</div>}
      {owns && dirty && <p className="text-xs text-slate-500">Guarde o briefing e os anexos antes de preparar a proposta.</p>}
      </aside>
    </form>
  </section>;
}
