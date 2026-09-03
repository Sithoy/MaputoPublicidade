'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FolderKanban,
  Headphones,
  History,
  LayoutDashboard,
  LibraryBig,
  Menu,
  MessageSquareText,
  PackageCheck,
  Palette,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { WorkflowJourney } from '@/components/workflow/WorkflowJourney';
import type { OrderStatus } from '@/lib/api';
import { cn, formatMZN } from '@/lib/utils';
import { whatsappHref } from '@/lib/company';

type DemoView = 'overview' | 'projects' | 'history' | 'approvals' | 'quotes' | 'brand';

type NavItem = {
  id: DemoView;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

const navItems: NavItem[] = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'projects', label: 'Projetos', icon: FolderKanban, badge: '3' },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'approvals', label: 'Aprovações', icon: BadgeCheck, badge: '1' },
  { id: 'quotes', label: 'Propostas', icon: FileText, badge: '1' },
  { id: 'brand', label: 'Biblioteca da marca', icon: LibraryBig },
];

const viewTitles: Record<DemoView, string> = {
  overview: 'Visão geral',
  projects: 'Projetos',
  history: 'Histórico de trabalhos',
  approvals: 'Aprovações',
  quotes: 'Propostas',
  brand: 'Biblioteca da marca',
};

type DemoProject = {
  reference: string;
  title: string;
  status: string;
  statusKey: OrderStatus;
  statusClass: string;
  progress: number;
  date: string;
  total: number;
  journeyDescription: string;
};

const projects: DemoProject[] = [
  {
    reference: 'MP-0148-2026',
    title: 'Sinalização da nova loja',
    status: 'Em produção',
    statusKey: 'in_production',
    statusClass: 'bg-violet-50 text-violet-700 ring-violet-200',
    progress: 72,
    date: 'Entrega prevista: 08 Set',
    total: 128500,
    journeyDescription: 'A sinalização está em produção e a entrega está prevista para 8 de Setembro.',
  },
  {
    reference: 'MP-0151-2026',
    title: 'Uniformes da equipa comercial',
    status: 'Aprovação necessária',
    statusKey: 'quoted',
    statusClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    progress: 43,
    date: 'Prova enviada hoje',
    total: 46750,
    journeyDescription: 'A prova digital está pronta e aguarda a sua aprovação para avançar.',
  },
  {
    reference: 'MP-0154-2026',
    title: 'Material para campanha de verão',
    status: 'Em análise',
    statusKey: 'reviewing',
    statusClass: 'bg-sky-50 text-sky-700 ring-sky-200',
    progress: 18,
    date: 'Pedido recebido: 02 Set',
    total: 0,
    journeyDescription: 'A equipa está a validar quantidades, materiais e o prazo do seu pedido.',
  },
];

const completedJobs = [
  {
    reference: 'MP-0096-2026',
    title: 'Menus e sinalização sazonal',
    deliveredAt: '18 Jul 2026',
    total: 86400,
    items: '6 itens',
    image: '/branddesk-demo/social-campaign.png',
    invoice: 'FT-2026-0081',
  },
  {
    reference: 'MP-0072-2026',
    title: 'Embalagens take-away',
    deliveredAt: '22 Mai 2026',
    total: 153000,
    items: '3 itens',
    image: '/branddesk-demo/brand-guidelines.png',
    invoice: 'FT-2026-0059',
  },
  {
    reference: 'MP-0031-2026',
    title: 'Uniformes da equipa de loja',
    deliveredAt: '14 Fev 2026',
    total: 58500,
    items: '42 peças',
    image: '/branddesk-demo/uniform-approval.png',
    invoice: 'FT-2026-0027',
  },
  {
    reference: 'MP-0189-2025',
    title: 'Campanha de fim de ano',
    deliveredAt: '12 Dez 2025',
    total: 112000,
    items: '8 itens',
    image: '/branddesk-demo/social-campaign.png',
    invoice: 'FT-2025-0164',
  },
];

const supportUrl = whatsappHref(
  'Olá! Explorei a demonstração do BrandDesk e gostaria de saber mais.'
);

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800 ring-1 ring-inset ring-amber-200">
      <Eye className="h-3.5 w-3.5" />
      Demonstração · dados fictícios
    </span>
  );
}

function Sidebar({
  view,
  onSelect,
  onClose,
}: {
  view: DemoView;
  onSelect: (view: DemoView) => void;
  onClose?: () => void;
}) {
  return (
    <aside className="flex h-full w-[282px] flex-col border-r border-[#dfe7e1] bg-white">
      <div className="flex h-[76px] items-center justify-between border-b border-[#e6ece7] px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo-tight.png"
            alt="Maputo Publicidade"
            width={116}
            height={43}
            className="h-9 w-auto object-contain"
            priority
          />
          <span className="h-8 w-px bg-[#dfe7e1]" aria-hidden="true" />
          <span className="leading-none">
            <span className="block text-[15px] font-extrabold tracking-[-0.035em] text-brand-900">
              BrandDesk
            </span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.17em] text-[#849188]">
              by Maputo Publicidade
            </span>
          </span>
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f2] text-[#56665d] lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="border-b border-[#edf1ee] p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-[#f3f7f3] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4662b] text-sm font-bold text-white">
            SA
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-dark">Sabores de África</p>
            <p className="truncate text-xs text-[#718078]">Conta de demonstração</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Navegação da demonstração">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a9890]">
          Espaço da sua marca
        </p>
        <button
          type="button"
          onClick={() => onSelect('projects')}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-800 px-3 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-20px_rgba(6,63,43,0.9)] transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Simular novo pedido
        </button>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                active
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-[#5d6d65] hover:bg-[#f5f7f4] hover:text-dark'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('h-[18px] w-[18px]', active ? 'text-brand-700' : 'text-[#829087]')} />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className={cn('rounded-full px-2 py-0.5 text-[10px]', active ? 'bg-white text-brand-800' : 'bg-[#edf1ee] text-[#64736b]')}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="hidden border-t border-[#e6ece7] p-4 [@media(min-height:850px)]:block">
        <div className="rounded-2xl bg-brand-900 p-4 text-white">
          <Sparkles className="h-5 w-5 text-brand-200" />
          <p className="mt-3 text-sm font-semibold">Gostaria de ter este controlo?</p>
          <p className="mt-1 text-xs leading-5 text-white/65">
            A equipa MP prepara o BrandDesk para a sua empresa.
          </p>
          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-brand-100"
          >
            Falar com a equipa
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </aside>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dfe7e1] bg-white p-5 shadow-[0_14px_38px_-34px_rgba(6,63,43,0.5)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#6a7971]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-dark">{value}</p>
          <p className="mt-1 text-xs text-[#829087]">{note}</p>
        </div>
        <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function ProjectList({ compact = false }: { compact?: boolean }) {
  return (
    <div className="divide-y divide-[#edf1ee]">
      {projects.map((project) => (
        <button
          key={project.reference}
          type="button"
          className="group flex w-full flex-col gap-3 py-4 text-left first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-brand-700">{project.reference}</span>
              <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', project.statusClass)}>
                {project.status}
              </span>
            </div>
            <p className="mt-1.5 truncate text-sm font-semibold text-dark sm:text-base">{project.title}</p>
            <p className="mt-1 text-xs text-[#7b8981]">{project.date}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className={cn('h-1.5 overflow-hidden rounded-full bg-[#e7ece8]', compact ? 'w-28' : 'w-44')}>
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${project.progress}%` }} />
              </div>
              <span className="text-[11px] font-medium text-[#718078]">{project.progress}%</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {project.total ? <span className="text-sm font-semibold text-dark">{formatMZN(project.total)}</span> : null}
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f6f3] text-[#64736b] transition group-hover:bg-brand-50 group-hover:text-brand-700">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function Overview({
  onSelect,
  selectedProjectReference,
  onSelectProject,
}: {
  onSelect: (view: DemoView) => void;
  selectedProjectReference: string;
  onSelectProject: (reference: string) => void;
}) {
  const selectedProject =
    projects.find((project) => project.reference === selectedProjectReference) || projects[0];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-brand-900 px-6 py-8 text-white shadow-[0_24px_60px_-38px_rgba(3,42,29,0.9)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[38px] border-white/[0.035]" />
        <div className="pointer-events-none absolute bottom-0 right-24 h-28 w-28 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="relative max-w-2xl">
          <p className="text-sm font-semibold text-brand-200">Bom dia, Sofia</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
            Uma decisão precisa da sua atenção.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/68 sm:text-base">
            A prova dos uniformes está pronta. Ao aprovar, a equipa pode avançar sem perder tempo ou contexto.
          </p>
          <button
            type="button"
            onClick={() => onSelect('approvals')}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-900 transition hover:-translate-y-0.5 hover:bg-[#f4f0e8]"
          >
            Rever prova digital
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumo da conta de demonstração">
        <StatCard icon={PackageCheck} label="Projetos ativos" value="3" note="em acompanhamento" tone="bg-brand-50 text-brand-700" />
        <StatCard icon={BadgeCheck} label="Aprovações pendentes" value="1" note="precisa da sua atenção" tone="bg-amber-50 text-amber-700" />
        <StatCard icon={Banknote} label="Pagamentos pendentes" value="64 250 MZN" note="saldo total por regularizar" tone="bg-sky-50 text-sky-700" />
      </section>

      <section className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Percurso do trabalho</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <h3 className="shrink-0 text-xl font-semibold tracking-[-0.02em] text-dark">Onde está o projeto:</h3>
              <div className="relative min-w-0 sm:max-w-[420px] sm:flex-1">
                <label htmlFor="demo-tracked-project" className="sr-only">Escolher projeto para acompanhar</label>
                <select
                  id="demo-tracked-project"
                  value={selectedProject.reference}
                  onChange={(event) => onSelectProject(event.target.value)}
                  className="h-11 w-full appearance-none truncate rounded-xl border border-[#d7e2da] bg-[#f8faf8] py-2 pl-3 pr-10 text-sm font-semibold text-brand-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50"
                >
                  {projects.map((project) => (
                    <option key={project.reference} value={project.reference}>{project.reference} — {project.title}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-700" />
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#718078]">{selectedProject.journeyDescription}</p>
          </div>
          <button type="button" onClick={() => onSelect('projects')} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900">
            Abrir projeto
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <WorkflowJourney status={selectedProject.statusKey} compact className="mt-6" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.58fr]">
        <div className="rounded-3xl border border-[#e3dac8] bg-[#f4f0e8] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d7040]">Próximo passo</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-dark">Aprovar a prova digital</h3>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#9b7535] shadow-sm">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#706858]">
            Confirme a posição do logótipo nos uniformes ou deixe um comentário para a equipa de design.
          </p>
          <button type="button" onClick={() => onSelect('approvals')} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#856526] hover:text-[#5f4719]">
            Tomar decisão
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Atividade</p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-dark">Projetos recentes</h3>
            </div>
            <button type="button" onClick={() => onSelect('projects')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5"><ProjectList compact /></div>
        </div>
      </section>
    </div>
  );
}

function ProjectsView() {
  return (
    <section className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Produção organizada</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-dark">Todos os projetos num só lugar</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">Prazos, valores, decisões e progresso ficam associados ao pedido certo.</p>
        </div>
        <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          Novo pedido
        </button>
      </div>
      <div className="mt-7"><ProjectList /></div>
      <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 ring-1 ring-inset ring-amber-200">
        Esta é uma demonstração. Os botões não criam nem alteram pedidos reais.
      </p>
    </section>
  );
}

function HistoryView() {
  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Memória da sua marca</p>
          <h2 className="mt-1.5 text-3xl font-semibold tracking-[-0.03em] text-dark">Histórico de trabalhos</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">Entregas, documentos e materiais aprovados continuam disponíveis quando precisar deles novamente.</p>
        </div>
        <button type="button" className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4" />Repetir um trabalho</button>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumo do histórico de demonstração">
        <StatCard icon={CheckCircle2} label="Trabalhos entregues" value="18" note="desde a criação da conta" tone="bg-brand-50 text-brand-700" />
        <StatCard icon={Banknote} label="Valor realizado" value="409 900 MZN" note="nos trabalhos apresentados" tone="bg-sky-50 text-sky-700" />
        <StatCard icon={Clock3} label="Última entrega" value="18 Jul 2026" note="menus e sinalização" tone="bg-amber-50 text-amber-700" />
      </section>

      <section className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-7">
        <div className="flex flex-col gap-4 border-b border-[#edf1ee] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Arquivo organizado</p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-dark">Trabalhos concluídos</h3>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-xl bg-brand-800 px-3 py-2 text-xs font-semibold text-white">2026</button>
            <button type="button" className="rounded-xl border border-[#d7e2da] bg-white px-3 py-2 text-xs font-semibold text-[#617068]">2025</button>
            <button type="button" className="rounded-xl border border-[#d7e2da] bg-white px-3 py-2 text-xs font-semibold text-[#617068]">Todos</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {completedJobs.map((job) => (
            <article key={job.reference} className="overflow-hidden rounded-2xl border border-[#dfe7e1] bg-white transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
              <div className="grid grid-cols-[112px_1fr] sm:grid-cols-[148px_1fr]">
                <div className="relative min-h-[184px] bg-[#f4f0e8]">
                  <Image src={job.image} alt={`Pré-visualização fictícia do trabalho ${job.title}`} fill sizes="148px" className="object-cover" />
                </div>
                <div className="min-w-0 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-brand-700">{job.reference}</span>
                    <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">Entregue</span>
                  </div>
                  <h4 className="mt-2 text-sm font-semibold leading-5 text-dark">{job.title}</h4>
                  <p className="mt-2 text-xs text-[#718078]">Entregue em {job.deliveredAt} · {job.items}</p>
                  <p className="mt-3 text-sm font-semibold text-dark">{formatMZN(job.total)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900"><RefreshCw className="h-3.5 w-3.5" />Repetir</button>
                    <span className="text-[#cbd4ce]" aria-hidden="true">·</span>
                    <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#617068] hover:text-dark"><FileText className="h-3.5 w-3.5" />{job.invoice}</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 ring-1 ring-inset ring-amber-200">Esta conta é fictícia. Num BrandDesk real, cada trabalho entregue aparece aqui com os respetivos documentos e ações.</p>
      </section>
    </div>
  );
}

function ApprovalsView() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-3xl border border-[#dfe7e1] bg-white shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)]">
        <div className="border-b border-[#e7ece8] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold text-brand-700">MP-0151-2026</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-dark">Uniformes da equipa comercial</h2>
              <p className="mt-2 text-sm text-[#718078]">Prova digital · versão 2 · enviada hoje às 10h24</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Aguarda aprovação</span>
          </div>
        </div>
        <div className="bg-[#edf1ed] p-5 sm:p-8">
          <div className="relative mx-auto aspect-[16/10] max-w-3xl overflow-hidden rounded-2xl bg-[#f8f3ea] shadow-[0_20px_50px_-34px_rgba(23,33,29,0.6)] ring-1 ring-black/5">
            <Image
              src="/branddesk-demo/uniform-approval.png"
              alt="Prova digital fictícia de polos verdes com bordado da marca Sabores de África"
              fill
              sizes="(max-width: 1280px) 90vw, 760px"
              className="object-cover"
            />
            <span className="absolute bottom-3 left-3 rounded-lg bg-white/92 px-3 py-1.5 text-[11px] font-semibold text-brand-900 shadow-sm backdrop-blur">
              Frente · costas · detalhe do bordado
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 p-5 sm:p-7">
          <button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
            <Check className="h-4 w-4" /> Aprovar esta versão
          </button>
          <button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d6dfd8] bg-white px-4 text-sm font-semibold text-[#405047]">
            <MessageSquareText className="h-4 w-4" /> Pedir alteração
          </button>
        </div>
      </section>

      <aside className="space-y-5">
        <div className="rounded-3xl border border-[#dfe7e1] bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Por que ajuda</p>
          <h3 className="mt-2 text-xl font-semibold text-dark">Uma decisão, uma versão</h3>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-[#617068]">
            {['Evita aprovações perdidas em mensagens', 'Mantém o histórico de cada versão', 'A equipa recebe a decisão imediatamente'].map((item) => (
              <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-brand-900 p-6 text-white">
          <ShieldCheck className="h-6 w-6 text-brand-200" />
          <h3 className="mt-4 text-lg font-semibold">Aprovação registada</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">Cada decisão fica associada à data, pessoa e versão corretas.</p>
        </div>
      </aside>
    </div>
  );
}

function QuotesView() {
  return (
    <section className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-[#e7ece8] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold text-brand-700">MP-0154-2026</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-dark">Proposta para campanha de verão</h2>
          <p className="mt-2 text-sm text-[#718078]">Válida até 12 de Setembro de 2026 · entrega estimada em 7 dias úteis</p>
        </div>
        <span className="self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Aguarda decisão</span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead><tr className="bg-brand-800 text-white"><th className="rounded-l-xl px-4 py-3 font-semibold">Descrição</th><th className="px-4 py-3 font-semibold">Qtd.</th><th className="px-4 py-3 font-semibold">Preço unit.</th><th className="rounded-r-xl px-4 py-3 text-right font-semibold">Total</th></tr></thead>
          <tbody className="divide-y divide-[#e7ece8]">
            <tr><td className="px-4 py-4 font-medium text-dark">Banners roll-up 85 × 200 cm</td><td className="px-4 py-4 text-[#68776f]">4</td><td className="px-4 py-4 text-[#68776f]">8 500 MZN</td><td className="px-4 py-4 text-right font-semibold text-dark">34 000 MZN</td></tr>
            <tr><td className="px-4 py-4 font-medium text-dark">T-shirts personalizadas</td><td className="px-4 py-4 text-[#68776f]">30</td><td className="px-4 py-4 text-[#68776f]">850 MZN</td><td className="px-4 py-4 text-right font-semibold text-dark">25 500 MZN</td></tr>
            <tr><td className="px-4 py-4 font-medium text-dark">Design e preparação de arte</td><td className="px-4 py-4 text-[#68776f]">1</td><td className="px-4 py-4 text-[#68776f]">4 750 MZN</td><td className="px-4 py-4 text-right font-semibold text-dark">4 750 MZN</td></tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-5 rounded-2xl bg-[#f3f7f3] p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718078]">Condições de pagamento</p>
          <p className="mt-2 text-sm font-semibold text-dark">50% adiantado · 50% na entrega</p>
        </div>
        <div className="text-left sm:text-right"><p className="text-xs text-[#718078]">Total da proposta</p><p className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-brand-900">64 250 MZN</p></div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"><Check className="h-4 w-4" /> Aprovar proposta</button>
        <button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d6dfd8] bg-white px-4 text-sm font-semibold text-[#405047]"><Download className="h-4 w-4" /> Descarregar PDF</button>
      </div>
    </section>
  );
}

function BrandLibraryView() {
  const assets = [
    { title: 'Identidade visual', type: 'PNG · 3,1 MB', icon: Palette, image: '/branddesk-demo/brand-guidelines.png', position: 'center' },
    { title: 'Uniforme aprovado', type: 'PNG · 2,3 MB', icon: FileCheck2, image: '/branddesk-demo/uniform-approval.png', position: 'center' },
    { title: 'Campanha social', type: 'PNG · 2,4 MB', icon: FolderKanban, image: '/branddesk-demo/social-campaign.png', position: 'center' },
    { title: 'Embalagens e aplicações', type: 'PNG · 3,1 MB', icon: Building2, image: '/branddesk-demo/brand-guidelines.png', position: 'right center' },
  ];
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-40px_rgba(6,63,43,0.5)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Identidade centralizada</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-dark">Os ficheiros certos, sempre disponíveis</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">A sua equipa e a Maputo Publicidade trabalham com versões aprovadas da marca.</p></div>
          <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d6dfd8] bg-white px-4 text-sm font-semibold text-[#405047]"><Upload className="h-4 w-4" /> Carregar ficheiro</button>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {assets.map((asset) => {
            const Icon = asset.icon;
            return (
              <button key={asset.title} type="button" className="group rounded-2xl border border-[#dfe7e1] p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f4f0e8]">
                  <Image
                    src={asset.image}
                    alt={`Pré-visualização fictícia: ${asset.title}`}
                    fill
                    sizes="(max-width: 640px) 90vw, (max-width: 1280px) 44vw, 260px"
                    className="object-cover transition duration-300 group-hover:scale-[1.025]"
                    style={{ objectPosition: asset.position }}
                  />
                  <span className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-brand-800 shadow-sm backdrop-blur">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold text-dark">{asset.title}</p>
                <div className="mt-1 flex items-center justify-between gap-3"><span className="text-xs text-[#829087]">{asset.type}</span><Download className="h-4 w-4 text-[#829087] transition group-hover:text-brand-700" /></div>
              </button>
            );
          })}
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={LibraryBig} label="Ativos de marca" value="24" note="ficheiros aprovados" tone="bg-brand-50 text-brand-700" />
        <StatCard icon={Palette} label="Cores oficiais" value="5" note="com códigos para impressão" tone="bg-[#f8f3ea] text-[#d4662b]" />
        <StatCard icon={ShieldCheck} label="Última atualização" value="28 Ago" note="por Sofia António" tone="bg-sky-50 text-sky-700" />
      </section>
    </div>
  );
}

export function BrandDeskDemo() {
  const [view, setView] = useState<DemoView>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedProjectReference, setSelectedProjectReference] = useState(projects[0].reference);

  function selectView(nextView: DemoView) {
    setView(nextView);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex min-h-screen bg-[#f3f6f2] text-dark">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block"><Sidebar view={view} onSelect={selectView} /></div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#dfe7e1] bg-white/95 backdrop-blur">
          <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dfe7e1] text-[#56665d] lg:hidden" aria-label="Abrir menu da demonstração"><Menu className="h-5 w-5" /></button>
              <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-brand-700">BrandDesk</p><h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-dark">{viewTitles[view]}</h1></div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block"><DemoBadge /></div>
              <button type="button" className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-[#dfe7e1] text-[#64736b] md:inline-flex" aria-label="Notificações da demonstração"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" /></button>
              <Link href="/area-cliente/login" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-800 px-3 text-xs font-semibold text-white transition hover:bg-brand-700 sm:px-4 sm:text-sm">Entrar na minha conta <ArrowRight className="hidden h-4 w-4 sm:block" /></Link>
            </div>
          </div>
          <div className="border-t border-[#edf1ee] px-4 py-2 sm:hidden"><DemoBadge /></div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1480px]">
            {view === 'overview' ? (
              <Overview
                onSelect={selectView}
                selectedProjectReference={selectedProjectReference}
                onSelectProject={setSelectedProjectReference}
              />
            ) : null}
            {view === 'projects' ? <ProjectsView /> : null}
            {view === 'history' ? <HistoryView /> : null}
            {view === 'approvals' ? <ApprovalsView /> : null}
            {view === 'quotes' ? <QuotesView /> : null}
            {view === 'brand' ? <BrandLibraryView /> : null}

            <section className="mt-5 flex flex-col items-start justify-between gap-5 rounded-3xl border border-brand-800/10 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="flex items-start gap-4"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Headphones className="h-5 w-5" /></span><div><h2 className="font-semibold text-dark">Pronto para organizar o trabalho da sua marca?</h2><p className="mt-1 text-sm leading-6 text-[#718078]">Fale com a equipa MP ou crie a sua conta para começar.</p></div></div>
              <div className="flex flex-wrap gap-3"><Link href="/" className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d6dfd8] bg-white px-4 text-sm font-semibold text-[#405047]"><ArrowLeft className="h-4 w-4" /> Voltar ao site</Link><a href={supportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Falar com a equipa <ArrowRight className="h-4 w-4" /></a></div>
            </section>
          </div>
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[#09130f]/55 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-[min(88vw,320px)] shadow-2xl" onClick={(event) => event.stopPropagation()}><Sidebar view={view} onSelect={selectView} onClose={() => setMobileOpen(false)} /></div>
        </div>
      ) : null}
    </div>
  );
}
