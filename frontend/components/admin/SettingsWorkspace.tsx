'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, LayoutGrid, Mail, MessageCircle, Settings2, ShieldCheck, Users } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchWithAuth } from '@/lib/auth';
import { companyProfile } from '@/lib/company';
import { EmailSettings } from './EmailSettings';
import { WhatsAppSettings } from './WhatsAppSettings';

type Section = 'overview' | 'company' | 'email' | 'whatsapp' | 'access';
const sections = [
  { id: 'overview', label: 'Visão geral', icon: LayoutGrid, group: 'Geral', description: 'Configuração da plataforma, organizada por área.' },
  { id: 'company', label: 'Empresa', icon: Building2, group: 'Geral', description: 'Identificação e contactos usados pelo website.' },
  { id: 'email', label: 'Email', icon: Mail, group: 'Comunicação', description: 'Caixa Atendimento, autorização OAuth e API Zoho.' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, group: 'Comunicação', description: 'Número da MP, ligação Meta e receção de mensagens.' },
  { id: 'access', label: 'Equipa e acessos', icon: Users, group: 'Administração', description: 'Utilizadores, funções e responsabilidades.' },
] as const;
type ChannelStatus = { email: string; whatsapp: string };

export function SettingsWorkspace() {
  const { loading, can } = useAdminAuth();
  const allowed = can('integrations.manage');
  const [section, setSection] = useState<Section>('overview');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ChannelStatus>({ email: 'A verificar…', whatsapp: 'A verificar…' });
  useEffect(() => {
    const initial = window.location.hash.slice(1);
    if (sections.some((entry) => entry.id === initial)) setSection(initial as Section);
  }, []);
  useEffect(() => {
    if (loading || !allowed || section !== 'overview') return;
    let active = true;
    setStatus({ email: 'A verificar…', whatsapp: 'A verificar…' });
    Promise.allSettled([
      fetchWithAuth('/api/integrations/email/oauth/'), fetchWithAuth('/api/integrations/whatsapp/'),
    ]).then(([email, whatsapp]) => {
      if (!active) return;
      const e = email.status === 'fulfilled' ? email.value as { connected: boolean; secret_configured: boolean; sending_active?: boolean } : null;
      const w = whatsapp.status === 'fulfilled' ? whatsapp.value as { enabled: boolean; tested_at: string | null } : null;
      setStatus({ email: !e ? 'Estado indisponível' : e.sending_active ? 'Envio ativo · sincronização na caixa MP' : e.connected ? 'API ligada · por ativar' : e.secret_configured ? 'Por autorizar' : 'Por configurar', whatsapp: !w ? 'Estado indisponível' : w.enabled ? 'Ativo' : w.tested_at ? 'Ativação pendente' : 'Por configurar' });
    });
    return () => { active = false; };
  }, [loading, allowed, section]);
  function open(value: Section) {
    if (value === section || busy) return;
    if (dirty && !window.confirm('Existem alterações por guardar. Deseja mudar de área sem guardar?')) return;
    setDirty(false); setSection(value);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${value}`);
  }
  if (loading) return <p role="status">A carregar Definições…</p>;
  if (!allowed) return <p role="alert">A sua função não permite gerir as Definições.</p>;
  const selected = sections.find((entry) => entry.id === section)!;
  const Icon = selected.icon;
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-brand-700">Administração · Configuração</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-900">Definições</h1><p className="mt-2 text-sm text-slate-500">A base da operação, num só lugar.</p></div><div className="flex items-center gap-2 rounded-full border border-[#ded9c6] bg-[#fbf7e9] px-3 py-2 text-xs text-[#766138]"><ShieldCheck className="h-4 w-4" />Acesso restrito à gestão</div></header>
    <div className="overflow-hidden rounded-2xl border border-[#dce3d3] bg-white shadow-sm lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Áreas de Definições" className="border-b bg-[#f5f7f0] p-4 lg:border-b-0 lg:border-r"><div className="mb-5 flex items-center gap-2 px-2 text-sm font-semibold text-brand-900"><Settings2 className="h-4 w-4 text-[#ad8d45]" />Configurar a MP</div>{['Geral', 'Comunicação', 'Administração'].map((group) => <div key={group} className="mb-4"><p className="mb-2 px-2 text-[10px] uppercase tracking-widest text-slate-500">{group}</p><div className="flex flex-wrap gap-1 lg:block">{sections.filter((entry) => entry.group === group).map((entry) => <button key={entry.id} type="button" disabled={busy} aria-current={section === entry.id ? 'page' : undefined} onClick={() => open(entry.id)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition disabled:opacity-50 lg:w-full ${section === entry.id ? 'bg-[#173f30] font-semibold text-white shadow-sm' : 'text-[#506253] hover:bg-[#e9eee2]'}`}><entry.icon aria-hidden="true" className="h-4 w-4" />{entry.label}</button>)}</div></div>)}</nav>
      <section aria-label={selected.label} className="min-w-0 p-5 lg:p-7"><header className="mb-6 flex items-start gap-3 border-b pb-5"><span className="rounded-xl bg-[#fbf7e9] p-3 text-[#a3823c]"><Icon aria-hidden="true" className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-brand-900">{selected.label}</h2><p className="mt-1 text-sm text-slate-500">{selected.description}</p></div>{dirty ? <span className="ml-auto text-xs font-medium text-amber-800">Alterações por guardar</span> : null}</header>
        {section === 'overview' ? <div className="space-y-6"><div className="grid gap-4 xl:grid-cols-2">{sections.filter((entry) => entry.id !== 'overview').map((entry) => <button key={entry.id} type="button" onClick={() => open(entry.id)} className="group rounded-2xl border border-[#e1e5d9] p-5 text-left transition hover:border-[#c3a451] hover:bg-[#fcfbf5]"><div className="flex items-center justify-between"><entry.icon className="h-5 w-5 text-brand-800" /><ArrowRight aria-hidden="true" className="h-4 w-4 text-[#ac9559]" /></div><h3 className="mt-4 text-sm font-semibold text-brand-900">{entry.label}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{entry.description}</p><p className="mt-4 border-t pt-3 text-[11px] font-semibold text-brand-800">{entry.id === 'email' ? status.email : entry.id === 'whatsapp' ? status.whatsapp : entry.id === 'company' ? 'Dados centralizados · consulta' : can('users.manage') ? 'Gerir utilizadores e funções' : 'Acesso conforme a sua função'}</p></button>)}</div><aside className="rounded-xl bg-[#f4f6ef] p-4 text-xs leading-6 text-slate-600">Configurar e testar um canal não equivale a ativá-lo. Email: ative na respetiva área; a sincronização ocorre enquanto a caixa MP está aberta. WhatsApp: a ativação depende da validação da Meta e do webhook.</aside></div> : null}
        {section === 'company' ? <section aria-label="Dados da empresa" className="space-y-5"><dl className="grid gap-4 md:grid-cols-2">{[['Nome legal', companyProfile.legalName], ['NUIT', companyProfile.nuit], ['Email público', companyProfile.email], ['Telefone principal', companyProfile.primaryPhone], ['Endereço', companyProfile.address], ['Horário', companyProfile.openingHoursLabel]].map(([label, value]) => <div key={label} className="rounded-xl border p-4"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 break-words text-sm font-semibold text-brand-900">{value}</dd></div>)}</dl><p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">Consulta dos dados públicos centralizados usados pelo website. A edição destes dados continua na configuração técnica da plataforma; este painel não os altera. O email público da empresa é distinto da caixa de Atendimento.</p></section> : null}
        {section === 'email' ? <EmailSettings embedded onDirtyChange={setDirty} onBusyChange={setBusy} /> : null}
        {section === 'whatsapp' ? <WhatsAppSettings embedded onDirtyChange={setDirty} onBusyChange={setBusy} /> : null}
        {section === 'access' ? <section className="rounded-2xl border p-5"><Users className="h-6 w-6 text-brand-800" /><h3 className="mt-4 font-semibold text-brand-900">Utilizadores e funções</h3><p className="mt-2 text-sm leading-6 text-slate-500">A gestão da equipa mantém-se na área de Utilizadores. Não duplicamos aqui contas ou permissões: cada pessoa conserva os acessos definidos para a sua função.</p>{can('users.manage') ? <Link href="/admin/utilizadores" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-white">Gerir equipa e acessos<ArrowRight className="h-4 w-4" /></Link> : <p className="mt-4 text-xs text-slate-500">A sua função não permite gerir utilizadores.</p>}</section> : null}
      </section>
    </div>
  </div>;
}
