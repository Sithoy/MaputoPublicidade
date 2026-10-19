'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/auth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { zohoAuthorizationUrl } from '@/lib/zoho-authorization-url';

type Config = { client_id: string; secret_configured: boolean; connected: boolean; tested_at: string | null; callback_url: string; sending_active?: boolean; receiving_active?: boolean; last_synced_at?: string | null };
const base = '/api/integrations/email/oauth/';

export function EmailSettings({ embedded = false, onDirtyChange, onBusyChange }: {
  embedded?: boolean; onDirtyChange?: (value: boolean) => void; onBusyChange?: (value: boolean) => void;
} = {}) {
  const { loading, can } = useAdminAuth();
  const allowed = can('integrations.manage');
  const [config, setConfig] = useState<Config | null>(null);
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const dirty = Boolean(secret) || Boolean(config && clientId !== config.client_id);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true;
    fetchWithAuth(base).then((value: Config) => { if (active) { setConfig(value); setClientId(value.client_id || ''); } }).catch(() => { if (active) setError('Não foi possível carregar a configuração OAuth.'); });
    const outcome = new URLSearchParams(window.location.search).get('zoho');
    if (outcome === 'connected') setNotice('Conta Atendimento ligada à API Zoho.');
    if (outcome === 'failed') setError('A autorização não foi concluída. Confirme a conta Atendimento e autorize novamente.');
    if (outcome) { const url = new URL(window.location.href); url.searchParams.delete('zoho'); window.history.replaceState(null, '', url.pathname + url.search + url.hash); }
    return () => { active = false; };
  }, [loading, allowed]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function perform(action: 'save' | 'start' | 'test' | 'activate') {
    if (!config || busy || (action !== 'save' && dirty)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const value = await fetchWithAuth(action === 'save' ? base : `${base}${action}/`, {
        method: action === 'save' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'save' ? { client_id: clientId, client_secret: secret } : action === 'activate' ? { enabled: !config.sending_active } : {}),
      });
      if (action === 'start') {
        window.location.assign(zohoAuthorizationUrl(value.url));
        return;
      }
      setConfig(value); setClientId(value.client_id); setSecret('');
      setNotice(value.detail || 'Cliente OAuth guardado. Autorize agora a conta Atendimento.');
    } catch { setError(action === 'test' ? 'A API Zoho não confirmou a ligação. Autorize novamente a conta Atendimento.' : 'Não foi possível concluir. Verifique o cliente OAuth, as permissões e a ligação ao backend.'); }
    finally { setBusy(false); }
  }
  async function sendTest() {
    if (!testEmail || busy || dirty) return;
    setBusy(true); setError(''); setNotice('');
    try { const result = await fetchWithAuth(`${base}send-test/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: testEmail }) }); setNotice(result.detail); }
    catch { setError('O envio não foi confirmado. Verifique a caixa Zoho antes de repetir o teste.'); }
    finally { setBusy(false); }
  }
  if (loading || !allowed) return null;
  return <section aria-label="Email Atendimento" className={embedded ? '' : 'rounded-2xl border bg-white p-6'}>
    {embedded ? null : <h2 className="text-xl font-semibold text-brand-900">Email · API Zoho</h2>}
    <p className="mt-2 text-sm text-slate-500">Ligação HTTPS à caixa Atendimento. Sem SMTP ou IMAP. O segredo e os tokens ficam encriptados no backend.</p>
    {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
    {notice ? <p role="status" className="mt-4 text-sm text-brand-800">{notice}</p> : null}
    {config ? <form onSubmit={(event) => { event.preventDefault(); void perform('save'); }} className="mt-5 space-y-4">
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
        <label className="text-xs">Caixa dedicada<input readOnly value="atendimento@maputopublicidade.com" className="mt-2 block w-full rounded-xl border bg-slate-50 p-3 text-sm" /></label>
        <label className="text-xs">Client ID<input required maxLength={200} value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label>
        <label className="text-xs md:col-span-2">Client Secret<input type="password" autoComplete="new-password" maxLength={255} value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={config.secret_configured ? 'Já configurado. Deixe vazio para manter.' : 'Introduza aqui — nunca no chat'} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label>
      </fieldset>
      <div className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600"><p>Na consola Zoho: Server-based Application, datacenter US (.com).</p><p className="break-all">Redirect URI: {config.callback_url}</p><p>Autorize com a caixa Atendimento. A palavra-passe anterior não é utilizada pela API.</p></div>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white">Guardar ligação</button>
        <button type="button" disabled={busy || dirty || !config.secret_configured} onClick={() => void perform('start')} className="rounded-xl border px-4 py-3 text-sm disabled:opacity-40">Autorizar no Zoho</button>
        <button type="button" disabled={busy || dirty || !config.connected} onClick={() => void perform('test')} className="rounded-xl border px-4 py-3 text-sm disabled:opacity-40">Testar API Zoho</button>
        <button type="button" disabled={busy || dirty || !config.connected} onClick={() => void perform('activate')} className="rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{config.sending_active ? 'Desativar email' : 'Ativar envio e receção'}</button>
      </div>
      <p className="text-xs text-slate-500">{config.connected ? 'Conta ligada à API.' : 'Autorização OAuth pendente.'} O teste de autenticação não envia emails. {config.sending_active ? 'Envio pelo site ativo por atendimento@maputopublicidade.com.' : 'O envio pelo site e a sincronização com a caixa MP ainda não estão ativos.'}</p>
      {config.receiving_active ? <p className="rounded-xl bg-brand-50 p-4 text-xs leading-6 text-brand-900">Importação ativa para novos emails a partir da ativação. Sincronização ao abrir/atualizar Mensagens e apoio, e a cada minuto enquanto a caixa estiver aberta. Não existe ainda um agendamento com o painel fechado. PDF e imagens até 3 MB podem ser tratados na caixa MP. Outros formatos e anexos de emails anteriores à atualização continuam no Zoho.</p> : null}
      {config.sending_active ? <fieldset disabled={busy || dirty} className="rounded-xl border p-4"><label className="text-xs">Destinatário do teste<input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className="mt-2 block w-full rounded-xl border p-3 text-sm" /></label><button type="button" disabled={!testEmail || busy || dirty} onClick={() => void sendTest()} className="mt-3 rounded-xl border px-4 py-3 text-sm disabled:opacity-40">Enviar email de teste</button></fieldset> : null}
    </form> : <p className="mt-4 text-sm">A carregar ligação…</p>}
  </section>;
}
