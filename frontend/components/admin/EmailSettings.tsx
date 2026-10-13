'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/auth';
import { useAdminAuth } from '@/hooks/useAdminAuth';

type Config = { mailbox: string; display_name: string; smtp_host: string; imap_host: string; password_configured: boolean; tested_at: string | null };
const base = '/api/integrations/email/';

export function EmailSettings() {
  const { loading, can } = useAdminAuth();
  const allowed = can('integrations.manage');
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<Config | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = Boolean(password) || JSON.stringify(form) !== JSON.stringify(config);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true;
    fetchWithAuth(base).then((value: Config) => { if (active) { setConfig(value); setForm(value); } }).catch(() => { if (active) setError('Não foi possível carregar a configuração de email.'); });
    return () => { active = false; };
  }, [loading, allowed]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function perform(test = false) {
    if (!form || busy || (test && dirty)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const value: Config & { detail?: string } = await fetchWithAuth(test ? `${base}test/` : base, {
        method: test ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test ? {} : { mailbox: form.mailbox, display_name: form.display_name, smtp_host: form.smtp_host, imap_host: form.imap_host, password }),
      });
      setConfig(value); setForm(value); setPassword(''); setNotice(value.detail || 'Dados guardados com a credencial encriptada.');
    } catch { setError('Não foi possível concluir. Verifique os dados e tente novamente.'); }
    finally { setBusy(false); }
  }
  if (loading || !allowed) return null;
  return <section aria-label="Email Atendimento" className="rounded-2xl border bg-white p-6"><h1 className="text-xl font-semibold text-brand-900">Email · Atendimento MP</h1><p className="mt-2 text-sm text-slate-500">Ligação à caixa dedicada Zoho. A credencial não é devolvida pela API nem aparece nos logs.</p>
    {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}{notice ? <p role="status" className="mt-4 text-sm text-brand-800">{notice}</p> : null}
    {form ? <form onSubmit={(event) => { event.preventDefault(); void perform(); }} className="mt-5 space-y-4"><fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
      <label className="text-xs">Caixa dedicada<input readOnly value={form.mailbox} className="mt-2 block w-full rounded-xl border bg-slate-50 p-3 text-sm" /></label>
      <label className="text-xs">Nome do remetente<input maxLength={160} required value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label>
      <label className="text-xs">Servidor SMTP · TLS 587<select value={form.smtp_host} onChange={(event) => setForm({ ...form, smtp_host: event.target.value })} className="mt-2 block w-full rounded-xl border p-3 text-sm"><option>smtppro.zoho.com</option><option>smtp.zoho.com</option></select></label>
      <label className="text-xs">Servidor IMAP · SSL 993<select value={form.imap_host} onChange={(event) => setForm({ ...form, imap_host: event.target.value })} className="mt-2 block w-full rounded-xl border p-3 text-sm"><option>imappro.zoho.com</option><option>imap.zoho.com</option></select></label>
      <label className="text-xs md:col-span-2">Credencial da caixa / palavra-passe de aplicação<input type="password" autoComplete="new-password" maxLength={255} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={config?.password_configured ? 'Já configurada. Deixe vazio para manter.' : 'Introduza aqui — nunca no chat'} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label>
    </fieldset><p className="text-xs text-slate-500">Use os servidores indicados nas definições da conta Zoho. Com autenticação de dois fatores, utilize uma palavra-passe de aplicação.</p><div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white">Guardar ligação</button><button type="button" disabled={busy || dirty || !config?.password_configured} onClick={() => void perform(true)} className="rounded-xl border px-4 py-3 text-sm disabled:opacity-40">Testar SMTP e IMAP</button></div><p className="text-xs text-slate-500">{config?.tested_at ? 'Autenticação verificada.' : 'Autenticação ainda por verificar.'} O teste não envia emails. O envio pelo site e a sincronização com a caixa MP ainda não estão ativos.</p></form> : <p className="mt-4 text-sm">A carregar ligação…</p>}
  </section>;
}
