'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/auth';

type Template = {
  id: string; name: string; language: string; supported: boolean; reason: string; revision: string;
  texts: { type: string; text: string }[];
  variables: { key: string; component: string; name: string }[];
};
type Page = { results: Template[]; after: string };
export function WhatsAppTemplateComposer({ conversationId, onSent, onSending, onFailed }: { conversationId: number; onSent: () => void; onSending: (busy: boolean) => void; onFailed?: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Template[]>([]);
  const [cursor, setCursor] = useState('');
  const [selected, setSelected] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const endpoint = `/api/support-conversations/${conversationId}/templates/`;
  const template = rows.find((row) => row.id === selected);
  const preview = template?.texts.map((part) => part.text.replace(/\{\{([^{}]+)\}\}/g, (match, name: string) => values[`${part.type}:${name}`] || match)).join('\n\n') || '';
  const complete = template?.supported && template.variables.every((field) => Boolean(values[field.key]?.trim())) && note.trim() && confirmed;

  async function load(after = '') {
    setBusy(true); setError('');
    try {
      const page: Page = await fetchWithAuth(endpoint + (after ? `?after=${encodeURIComponent(after)}` : ''));
      if (active.current) { setRows((current) => after ? [...current, ...page.results].filter((row, index, all) => all.findIndex((item) => item.id === row.id) === index) : page.results); setCursor(page.after); setLoaded(true); }
    } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : 'Não foi possível consultar templates.'); }
    finally { if (active.current) setBusy(false); }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!template || !complete || busy) return;
    setBusy(true); setError(''); onSending(true);
    try {
      await fetchWithAuth(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template_id: template.id, revision: template.revision, name: template.name, language: template.language, parameters: values, consent_note: note.trim(), confirmed }) });
      onSent();
    } catch (reason) { if (active.current) { setError(reason instanceof Error ? reason.message : 'Envio não confirmado. Verifique no telefone antes de reenviar.'); onFailed?.(); } }
    finally { onSending(false); if (active.current) setBusy(false); }
  }
  return <section className="my-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
    <button type="button" aria-expanded={open} disabled={busy} onClick={() => { setOpen(!open); if (!open && !loaded) void load(); }} className="text-sm font-semibold text-brand-800">{open ? 'Fechar templates' : 'Enviar template aprovado'}</button>
    {open ? <form onSubmit={send} className="mt-4 space-y-4">
      <p className="text-xs leading-5 text-slate-600">Templates de serviço (UTILITY), com texto e variáveis, aprovados pela Meta. Podem ser enviados fora das 24 horas; não reabrem a janela de texto livre. A Meta pode cobrar pelo envio. Confirme a autorização do cliente, não use para mensagens não solicitadas.</p>
      {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
      <fieldset disabled={busy} className="space-y-3">
        <label className="block text-sm">Template<select value={selected} onChange={(event) => { setSelected(event.target.value); setValues({}); setConfirmed(false); }} className="mt-2 w-full rounded-lg border bg-white p-3"><option value="">Escolher template…</option>{rows.map((row) => <option key={row.id} value={row.id} disabled={!row.supported}>{row.name} · {row.language}{row.supported ? '' : ' · não suportado'}</option>)}</select></label>
        {loaded && !rows.length ? <p className="text-sm">Nenhum template aprovado. Crie e submeta um template no WhatsApp Manager da Meta.</p> : null}
        {rows.filter((row) => !row.supported).map((row) => <p key={row.id} className="text-xs text-slate-500">{row.name}: {row.reason}</p>)}
        {template?.variables.map((field) => <label key={field.key} className="block text-sm">{field.component === 'header' ? 'Cabeçalho' : 'Mensagem'} · {field.name}<input value={values[field.key] || ''} onChange={(event) => { setValues({ ...values, [field.key]: event.target.value }); setConfirmed(false); }} maxLength={600} className="mt-1 w-full rounded-lg border p-2" /></label>)}
        {template ? <><div className="rounded-lg border bg-white p-4"><h4 className="text-xs font-semibold">Pré-visualização</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm">{preview}</p></div>
          <label className="block text-sm">Registo da autorização do cliente<input value={note} onChange={(event) => { setNote(event.target.value); setConfirmed(false); }} maxLength={500} placeholder="Ex.: autorização por email em 11/10/2026" className="mt-1 w-full rounded-lg border p-2" /></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />Confirmei a autorização, revi a mensagem e quero enviar este template.</label>
          <button disabled={!complete} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Enviar template</button>
        </> : null}
        <div className="flex gap-4 text-xs"><button type="button" onClick={() => { setSelected(''); setValues({}); setConfirmed(false); void load(); }}>Atualizar templates</button>{cursor ? <button type="button" onClick={() => load(cursor)}>Mais templates</button> : null}</div>
      </fieldset>
      {busy ? <p role="status" className="text-sm">A comunicar com a Meta…</p> : null}
    </form> : null}
  </section>;
}
