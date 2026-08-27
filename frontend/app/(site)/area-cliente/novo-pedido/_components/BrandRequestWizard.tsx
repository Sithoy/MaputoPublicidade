'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleHelp,
  ClipboardPenLine,
  Layers3,
  PackagePlus,
  RefreshCcw,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  createBrandRequest,
  getMe,
  type BrandRequestIntent,
} from '@/lib/client-api';

type IntentOption = {
  id: BrandRequestIntent;
  title: string;
  description: string;
  icon: LucideIcon;
};

const intentOptions: IntentOption[] = [
  {
    id: 'quote',
    title: 'Preciso de um orçamento',
    description: 'Já sabe o que precisa e quer receber uma proposta da equipa MP.',
    icon: ClipboardPenLine,
  },
  {
    id: 'catalogue',
    title: 'Quero um produto do catálogo',
    description: 'Cartões, rollups, uniformes, brindes e outros materiais recorrentes.',
    icon: ShoppingBag,
  },
  {
    id: 'reorder',
    title: 'Quero repetir um pedido',
    description: 'Reutilize um trabalho anterior e altere apenas quantidade, data ou detalhes.',
    icon: RefreshCcw,
  },
  {
    id: 'campaign',
    title: 'Tenho um evento ou campanha',
    description: 'Organize vários materiais como um único projeto de marca.',
    icon: Layers3,
  },
  {
    id: 'guidance',
    title: 'Preciso de ajuda para escolher',
    description: 'Conte-nos o objetivo e recomendamos a combinação certa.',
    icon: CircleHelp,
  },
];

function getInitialIntent(value: string | null, sourceReference: string | null) {
  if (sourceReference) return 'reorder' as const;
  return intentOptions.some((option) => option.id === value)
    ? (value as BrandRequestIntent)
    : null;
}

export function BrandRequestWizard() {
  const searchParams = useSearchParams();
  const sourceReference = searchParams.get('repetir');
  const initialIntent = getInitialIntent(searchParams.get('tipo'), sourceReference);
  const [step, setStep] = useState<1 | 2>(initialIntent ? 2 : 1);
  const [intent, setIntent] = useState<BrandRequestIntent | null>(initialIntent);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdReference, setCreatedReference] = useState('');
  const [contact, setContact] = useState({ name: '', email: '', phone: '', company: '' });

  useEffect(() => {
    getMe()
      .then((user) => {
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
        setContact({
          name,
          email: user.email,
          phone: user.profile?.phone || '',
          company: user.profile?.company || '',
        });
      })
      .catch((profileError) => {
        setError(profileError instanceof Error ? profileError.message : 'Não foi possível carregar o seu perfil.');
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const selectedIntent = useMemo(
    () => intentOptions.find((option) => option.id === intent) ?? null,
    [intent]
  );
  const SelectedIntentIcon = selectedIntent?.icon ?? PackagePlus;

  function continueToBrief() {
    if (!intent) return;
    setError('');
    setStep(2);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intent) return;

    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');
    try {
      const quote = await createBrandRequest({
        intent,
        projectName: String(formData.get('project_name') || '').trim(),
        serviceType: String(formData.get('service_type') || '').trim(),
        quantity: Number(formData.get('quantity') || 1),
        deadline: String(formData.get('deadline') || ''),
        fulfilment: formData.get('fulfilment') as 'pickup' | 'delivery' | 'installation',
        sourceReference: String(formData.get('source_reference') || '').trim(),
        needsDesign: formData.get('needs_design') === 'true',
        urgency: formData.get('urgency') as 'normal' | 'urgent',
        notes: String(formData.get('notes') || '').trim(),
        contact,
      });
      setCreatedReference(quote.reference);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível registar o pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  if (createdReference) {
    return (
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[30px] border border-brand-100 bg-white shadow-[0_28px_80px_-54px_rgba(6,63,43,0.6)]">
        <div className="bg-brand-900 px-6 py-10 text-white sm:px-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
            <Check className="h-6 w-6" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-brand-200">Pedido recebido</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            A sua equipa MP já tem o contexto.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
            Criámos o projeto {createdReference}. A equipa vai analisar o briefing e o próximo passo aparecerá no BrandDesk.
          </p>
        </div>
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:p-10">
          <Link
            href={`/area-cliente/orcamentos/${createdReference}`}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Abrir projeto
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/area-cliente"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-[#d7e1da] px-5 text-sm font-semibold text-[#405047] transition hover:bg-[#f5f7f4]"
          >
            Voltar à visão geral
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] bg-brand-900 px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[48px] border-white/[0.04]" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-100 ring-1 ring-white/10">
              <Sparkles className="h-3.5 w-3.5" />
              Novo projeto no BrandDesk
            </div>
            <h1 className="mt-5 text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
              Comece pelo que precisa, não pela máquina.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
              Diga-nos o objetivo. Nós organizamos os produtos, materiais e próximos passos consigo.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-white/65" aria-label={`Passo ${step} de 2`}>
            <span className={step >= 1 ? 'text-white' : undefined}>1. Objetivo</span>
            <span className="h-px w-8 bg-white/25" aria-hidden="true" />
            <span className={step >= 2 ? 'text-white' : undefined}>2. Briefing</span>
          </div>
        </div>
      </section>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <section>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">O que quer fazer?</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-dark">Escolha o ponto de partida</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {intentOptions.map((option) => {
              const Icon = option.icon;
              const selected = intent === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setIntent(option.id)}
                  aria-pressed={selected}
                  className={`group min-h-44 rounded-2xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-brand/35 focus:ring-offset-2 ${
                    selected
                      ? 'border-brand-500 bg-brand-50 shadow-[0_18px_48px_-38px_rgba(6,63,43,0.75)]'
                      : 'border-[#dfe7e1] bg-white hover:-translate-y-0.5 hover:border-brand-200'
                  }`}
                >
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${selected ? 'bg-brand text-white' : 'bg-[#f0f4f0] text-brand-700'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-5 block text-base font-semibold text-dark">{option.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-[#718078]">{option.description}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#718078]">Pode alterar esta escolha antes de enviar o briefing.</p>
            <Button onClick={continueToBrief} disabled={!intent} className="h-11 gap-2 px-5">
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-3xl border border-[#dfe7e1] bg-white p-5 shadow-[0_18px_48px_-42px_rgba(6,63,43,0.5)] sm:p-7">
            <div className="flex flex-col gap-4 border-b border-[#edf1ee] pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Briefing do projeto</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-dark">Conte-nos o essencial</h2>
                <p className="mt-2 text-sm leading-6 text-[#718078]">A equipa confirma materiais, acabamentos e prazos depois de analisar o pedido.</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Alterar objetivo
              </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {intent === 'catalogue' ? (
                <div className="sm:col-span-2 flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand-900">Ainda está a escolher o produto?</p>
                    <p className="mt-1 text-xs leading-5 text-brand-800/70">Consulte opções e especificações antes de concluir o briefing.</p>
                  </div>
                  <Link
                    href="/catalogo"
                    target="_blank"
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-100"
                  >
                    Explorar catálogo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Label htmlFor="project_name" className="font-semibold text-[#33443b]">Nome do projeto *</Label>
                <Input
                  id="project_name"
                  name="project_name"
                  maxLength={255}
                  required
                  defaultValue={sourceReference ? `Repetição do pedido ${sourceReference}` : ''}
                  placeholder="Ex.: Materiais para conferência anual"
                  className="mt-2 h-12 rounded-xl border-[#d9e2dc]"
                />
              </div>
              <div>
                <Label htmlFor="service_type" className="font-semibold text-[#33443b]">Produto ou serviço</Label>
                <Input id="service_type" name="service_type" placeholder="Ex.: rollups, polos e brindes" className="mt-2 h-12 rounded-xl border-[#d9e2dc]" />
              </div>
              <div>
                <Label htmlFor="quantity" className="font-semibold text-[#33443b]">Quantidade estimada</Label>
                <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className="mt-2 h-12 rounded-xl border-[#d9e2dc]" />
              </div>
              <div>
                <Label htmlFor="deadline" className="font-semibold text-[#33443b]">Data pretendida</Label>
                <div className="relative mt-2">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9890]" />
                  <Input id="deadline" name="deadline" type="date" className="h-12 rounded-xl border-[#d9e2dc] pl-11" />
                </div>
              </div>
              <div>
                <Label htmlFor="fulfilment" className="font-semibold text-[#33443b]">Como pretende receber?</Label>
                <Select id="fulfilment" name="fulfilment" defaultValue="pickup" className="mt-2 h-12 rounded-xl border-[#d9e2dc]">
                  <option value="pickup">Levantamento na MP</option>
                  <option value="delivery">Entrega</option>
                  <option value="installation">Entrega e instalação</option>
                </Select>
              </div>
              {intent === 'reorder' ? (
                <div>
                  <Label htmlFor="source_reference" className="font-semibold text-[#33443b]">Referência anterior *</Label>
                  <Input id="source_reference" name="source_reference" required defaultValue={sourceReference || ''} placeholder="ENC-2026-0001" className="mt-2 h-12 rounded-xl border-[#d9e2dc]" />
                </div>
              ) : null}
              <div className={intent === 'reorder' ? undefined : 'sm:col-span-2'}>
                <Label htmlFor="urgency" className="font-semibold text-[#33443b]">Prioridade</Label>
                <Select id="urgency" name="urgency" defaultValue="normal" className="mt-2 h-12 rounded-xl border-[#d9e2dc]">
                  <option value="normal">Planeada</option>
                  <option value="urgent">Urgente</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dfe7e1] bg-[#f8faf7] p-4">
                  <input name="needs_design" type="checkbox" value="true" className="mt-0.5 h-4 w-4 rounded border-[#bfcac2] text-brand focus:ring-brand" />
                  <span>
                    <span className="block text-sm font-semibold text-dark">Preciso de apoio com design ou arte final</span>
                    <span className="mt-1 block text-xs leading-5 text-[#718078]">A equipa inclui esta necessidade na análise do projeto.</span>
                  </span>
                </label>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes" className="font-semibold text-[#33443b]">Contexto, medidas ou observações</Label>
                <Textarea id="notes" name="notes" rows={6} placeholder="Explique o objetivo, público, local, referências visuais ou qualquer restrição importante..." className="mt-2 rounded-xl border-[#d9e2dc]" />
              </div>
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-[100px] xl:self-start">
            <div className="rounded-3xl border border-[#dfe7e1] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Resumo</p>
              <div className="mt-4 flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <SelectedIntentIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-dark">{selectedIntent?.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#718078]">{selectedIntent?.description}</p>
                </div>
              </div>
              <div className="mt-5 border-t border-[#edf1ee] pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8a9890]">Contacto</p>
                {loadingProfile ? (
                  <div className="mt-3 h-12 animate-pulse rounded-xl bg-[#edf2ee]" />
                ) : (
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="font-semibold text-dark">{contact.company || contact.name}</p>
                    {contact.company ? <p className="text-[#718078]">{contact.name}</p> : null}
                    <p className="break-all text-xs text-[#829087]">{contact.email}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-[#f4f0e8] p-5">
              <p className="text-sm font-semibold text-dark">O que acontece depois?</p>
              <ol className="mt-4 space-y-3 text-xs leading-5 text-[#706858]">
                <li className="flex gap-3"><span className="font-bold text-[#9a7536]">01</span>A equipa confirma o briefing.</li>
                <li className="flex gap-3"><span className="font-bold text-[#9a7536]">02</span>Recebe a proposta no BrandDesk.</li>
                <li className="flex gap-3"><span className="font-bold text-[#9a7536]">03</span>Aprova antes da produção.</li>
              </ol>
            </div>

            <Button type="submit" disabled={submitting || loadingProfile || !contact.email} className="h-12 w-full gap-2">
              {submitting ? 'A registar...' : 'Enviar pedido'}
              {submitting ? null : <ArrowRight className="h-4 w-4" />}
            </Button>
          </aside>
        </form>
      )}
    </div>
  );
}
