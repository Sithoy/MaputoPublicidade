'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/auth';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const base = '/api/integrations/whatsapp/';
const fields = [
  ['business_name', 'Nome da empresa', 'Ex.: Maputo Publicidade'],
  ['business_phone', 'Número WhatsApp', '+258… (formato internacional)'],
  ['portfolio_id', 'ID do portefólio empresarial Meta', 'Opcional, útil para o onboarding'],
  ['waba_id', 'WhatsApp Business Account ID (WABA)', 'Na conta WhatsApp do Meta Business'],
  ['phone_number_id', 'Phone Number ID', 'Não é o número de telefone'],
  ['app_id', 'Meta App ID', 'Na aplicação Meta que recebe os webhooks'],
  ['api_version', 'Versão Graph API', 'Ex.: v25.0'],
  ['onboarding_provider', 'Fornecedor de onboarding', 'Opcional: quem ativou Coexistence'],
] as const;
const secretFields = [
  ['access_token', 'Token de acesso', 'Token de sistema com whatsapp_business_messaging e whatsapp_business_management. Não use um token temporário para produção.'],
  ['app_secret', 'Meta App Secret', 'Usado para verificar a assinatura das mensagens recebidas. Não é o token de acesso.'],
  ['verify_token', 'Token de verificação do webhook', 'Defina pelo menos 16 caracteres ou gere um token. Copie o mesmo valor para a Meta antes de guardar.'],
] as const;
type Key = typeof fields[number][0];
type SecretKey = typeof secretFields[number][0];
type Form = Record<Key, string> & { mode: 'coexistence' | 'api_only'; onboarding_confirmed: boolean; enabled: boolean };
type Configuration = Partial<Form> & {
  credential_status: Record<SecretKey, boolean>; missing_fields: string[]; webhook_url: string;
  tested_at: string | null; webhook_verified_at: string | null; last_received_at: string | null;
};
function formFrom(config: Configuration): Form {
  const details = Object.fromEntries(fields.map(([key]) => [key, config[key] || (key === 'api_version' ? 'v25.0' : '')])) as Record<Key, string>;
  return { ...details, mode: config.mode || 'coexistence', onboarding_confirmed: Boolean(config.onboarding_confirmed), enabled: Boolean(config.enabled) };
}
const labels: Record<string, string> = { ...Object.fromEntries([...fields, ...secretFields].map(([key, label]) => [key, label])), onboarding_confirmed: 'Confirmar onboarding Coexistence' };
const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand';
const emptySecrets = { access_token: '', app_secret: '', verify_token: '' };

export function WhatsAppSettings({ embedded = false, onDirtyChange, onBusyChange }: {
  embedded?: boolean; onDirtyChange?: (value: boolean) => void; onBusyChange?: (value: boolean) => void;
} = {}) {
  const { loading, can } = useAdminAuth();
  const allowed = can('integrations.manage');
  const [config, setConfig] = useState<Configuration | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [savedForm, setSavedForm] = useState<Form | null>(null);
  const [secrets, setSecrets] = useState(emptySecrets);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm) || Object.values(secrets).some(Boolean);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  const connectionDirty = JSON.stringify({ ...form, enabled: false }) !== JSON.stringify({ ...savedForm, enabled: false }) || Object.values(secrets).some(Boolean);
  const ready = config && !config.missing_fields.length && config.tested_at && config.webhook_verified_at;

  function accept(result: Configuration) {
    setConfig(result); const values = formFrom(result); setForm(values); setSavedForm(values); setSecrets(emptySecrets);
  }
  useEffect(() => {
    if (loading || !allowed) return;
    let active = true;
    fetchWithAuth(base).then((result: Configuration) => { if (active) accept(result); })
      .catch(() => { if (active) setError('Não foi possível carregar as definições. Atualize a página para tentar novamente.'); });
    return () => { active = false; };
  }, [loading, allowed]);

  async function run(action: 'save' | 'test' | 'token' | 'refresh') {
    if (!form || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'token') {
        const result: { verify_token: string; settings: Configuration } = await fetchWithAuth(`${base}verify-token/`, { method: 'POST' });
        setConfig(result.settings);
        setForm((current) => current ? { ...current, enabled: false } : current);
        setSavedForm((current) => current ? { ...current, enabled: false } : current);
        setSecrets((current) => ({ ...current, verify_token: result.verify_token }));
        setNotice('Token gerado. Copie-o para a Meta; a integração fica desativada até à nova verificação.');
      } else if (action === 'save') {
        const result: Configuration = await fetchWithAuth(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, ...secrets }) });
        accept(result); setNotice('Configuração guardada. As credenciais não serão mostradas novamente.');
      } else {
        const result: Configuration = await fetchWithAuth(action === 'test' ? `${base}test/` : base, { method: action === 'test' ? 'POST' : 'GET' });
        accept(result); setNotice(action === 'test' ? 'A Meta confirmou o token, a conta e o número. Verifique também o webhook antes de ativar.' : 'Estado atualizado.');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível concluir a operação.'); }
    finally { setBusy(false); }
  }
  function save(event: FormEvent) { event.preventDefault(); void run('save'); }
  if (loading) return <p>A carregar…</p>;
  if (!allowed) return <p role="alert">A sua função não permite gerir integrações.</p>;

  return <div className={embedded ? "space-y-6" : "mx-auto max-w-5xl space-y-6"}>
    {embedded ? <p className="text-sm leading-6 text-slate-500">Ligue o atendimento WhatsApp a Mensagens e apoio. Guardar os dados não ativa o número: conclua primeiro o onboarding na Meta.</p> : <header className="rounded-3xl bg-brand-900 p-7 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-brand-200">Definições · Integrações</p><h2 className="mt-3 text-3xl font-semibold">WhatsApp da MP</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">Ligue o atendimento WhatsApp a Mensagens e apoio. Guardar os dados não migra o número nem ativa Coexistence: esse processo deve ser concluído na Meta / fornecedor elegível.</p></header>}
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">{notice}</p> : null}
    {!form || !config ? <p>A aguardar configuração…</p> : <form onSubmit={save} className="space-y-6">
      <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Estado: {config.enabled ? 'Ativo' : 'Não ativo'}</h2><button type="button" disabled={busy || dirty} onClick={() => run('refresh')} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50">Atualizar estado</button></div>
        <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><li>1. Dados {config.missing_fields.length ? 'por completar' : 'guardados'}</li><li>2. Ligação {config.tested_at ? 'testada' : 'por testar'}</li><li>3. Webhook {config.webhook_verified_at ? 'verificado' : 'por verificar'}</li></ol>
        {config.missing_fields.length ? <p className="mt-3 text-sm text-amber-800">Falta: {config.missing_fields.map((field) => labels[field] || field).join(', ')}.</p> : null}
        <p className="mt-3 text-xs text-slate-500">Último evento recebido: {config.last_received_at ? new Date(config.last_received_at).toLocaleString('pt-MZ') : 'Ainda nenhum. Após ativar, envie uma mensagem real para confirmar a receção.'}</p>
      </section>
      <fieldset disabled={busy} className="space-y-4 rounded-2xl border bg-white p-5"><legend className="px-2 font-semibold">1. Empresa e ligação Meta</legend>
        <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, hint]) => <label key={key} htmlFor={`wa-${key}`} className="text-sm font-medium">{label}<input id={`wa-${key}`} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value, enabled: false })} maxLength={key === 'business_phone' ? 16 : 160} placeholder={hint} className={inputClass} /></label>)}</div>
        <label htmlFor="wa-mode" className="block text-sm font-medium">Como pretende usar o número?<select id="wa-mode" value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as Form['mode'], enabled: false })} className={inputClass}><option value="coexistence">Coexistence — telefone e inbox no mesmo número</option><option value="api_only">Apenas API — sem aplicação Business no mesmo número</option></select></label>
        {form.mode === 'coexistence' ? <div className="rounded-xl bg-amber-50 p-4 text-sm"><p>Confirme a elegibilidade e o onboarding antes de migrar o número. Não elimine a conta WhatsApp Business para experimentar esta ligação.</p><label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={form.onboarding_confirmed} onChange={(event) => setForm({ ...form, onboarding_confirmed: event.target.checked, enabled: false })} className="mt-1" />O onboarding Coexistence deste número já foi concluído pela Meta / fornecedor.</label></div> : null}
      </fieldset>
      <fieldset disabled={busy} className="space-y-5 rounded-2xl border bg-white p-5"><legend className="px-2 font-semibold">2. Credenciais privadas</legend><p className="text-sm text-slate-500">Guardadas com encriptação no backend. Deixe em branco para manter o valor existente. Não envie tokens ou palavras-passe por chat.</p>
        {secretFields.map(([key, label, hint]) => <div key={key}><label htmlFor={`wa-${key}`} className="text-sm font-medium">{label} · {config.credential_status[key] ? 'Guardado' : 'Por preencher'}</label><input id={`wa-${key}`} type={key === 'verify_token' ? 'text' : 'password'} autoComplete="off" value={secrets[key]} onChange={(event) => { setSecrets({ ...secrets, [key]: event.target.value }); setForm({ ...form, enabled: false }); }} maxLength={key === 'access_token' ? 4000 : 255} className={inputClass} /><p className="mt-1 text-xs text-slate-500">{hint}</p></div>)}
        <button type="button" onClick={() => { if (window.confirm('Gerar um novo token desativa a ligação e exige nova verificação na Meta. Continuar?')) void run('token'); }} className="rounded-xl border px-4 py-2 text-sm">Gerar token de verificação</button>
      </fieldset>
      <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="font-semibold">3. Webhook e ativação</h2><label htmlFor="wa-callback" className="block text-sm font-medium">Callback URL para a Meta<input id="wa-callback" readOnly value={config.webhook_url} className={inputClass} /></label>
        <p className="text-sm leading-6 text-slate-600">Na aplicação Meta, configure esta URL e o token de verificação. Subscreva o campo <code>messages</code> e a aplicação à conta WABA. Para refletir respostas enviadas pelo telefone, subscreva também <code>smb_message_echoes</code>, quando disponível no onboarding Coexistence.</p>
        <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || dirty || Boolean(config.missing_fields.length)} onClick={() => run('test')} className="rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50">Testar ligação Meta</button><button disabled={busy || !dirty} className="rounded-xl bg-brand-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Guardar configuração</button></div>
        {dirty ? <p className="text-xs text-amber-800">Guarde as alterações antes de testar ou atualizar o estado.</p> : null}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} disabled={busy || ((!ready || connectionDirty) && !form.enabled)} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />Ativar mensagens WhatsApp no inbox</label>
        <p className="text-xs text-slate-500">Depois de selecionar a ativação, guarde. Respostas livres pela API respeitam a janela de 24 horas. Fora dela, use um template de serviço aprovado no inbox ou o telefone em Coexistence. Pode pré-visualizar imagens e PDFs recebidos (até 20 MB); outros formatos e templates com botões/media ainda não são suportados.</p>
        <Link href="/admin/apoio" className="inline-block text-sm font-semibold text-brand-800">Abrir Mensagens e apoio →</Link>
      </section>
    </form>}
  </div>;
}
