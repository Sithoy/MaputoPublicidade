'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  History,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TestCredentialsButton } from '@/components/TestCredentialsButton';
import { login } from '@/lib/auth';

const WHATSAPP_URL =
  'https://wa.me/25882555736?text=Ol%C3%A1%21%20Preciso%20de%20ajuda%20com%20o%20BrandDesk.';

const portalBenefits = [
  {
    icon: PackageCheck,
    title: 'Acompanhe cada pedido',
    description: 'Consulte o estado da produção, entrega e pagamentos.',
  },
  {
    icon: CheckCircle2,
    title: 'Aprove com confiança',
    description: 'Reveja propostas e provas antes de avançarmos.',
  },
  {
    icon: History,
    title: 'Mantenha tudo organizado',
    description: 'Encontre o histórico e os detalhes da sua marca num só lugar.',
  },
];

function ClientLoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    try {
      const data = await login(formData.get('email') as string, formData.get('password') as string);
      const user = data.data?.user;
      router.push(user?.is_staff ? '/admin' : '/area-cliente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar sessão.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-[#f7f9f5]">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[#f4f0e8] blur-3xl" />

      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/logo-tight.png"
              alt="Maputo Publicidade"
              width={132}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#53635a] transition hover:bg-white/70 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </Link>
        </div>
      </header>

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-4 pb-12 pt-28 lg:grid-cols-[1.08fr_0.92fr] lg:px-6 lg:py-28">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-800 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            BrandDesk by Maputo Publicidade
          </div>

          <h1 className="mt-6 max-w-xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-dark sm:text-5xl lg:text-[3.55rem]">
            O trabalho da sua marca, organizado num só lugar.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#5d6d65] sm:text-lg">
            Peça, aprove e acompanhe materiais de marca sem perder ficheiros, decisões ou contexto pelo caminho.
          </p>

          <div className="mt-9 hidden gap-3 sm:grid sm:grid-cols-3 lg:max-w-2xl">
            {portalBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-[#dfe7e1] bg-white/75 p-4 shadow-[0_16px_44px_-34px_rgba(6,63,43,0.45)] backdrop-blur"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-semibold text-dark">{benefit.title}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-[#68776f]">{benefit.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-7 hidden flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#607068] sm:flex">
            <span className="inline-flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-brand" />
              Acesso seguro
            </span>
            <span className="inline-flex items-center gap-2">
              <Headphones className="h-4 w-4 text-brand" />
              Acompanhamento da equipa MP
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[470px] lg:mr-0">
          <div className="rounded-[28px] border border-white bg-white/95 p-5 shadow-[0_28px_80px_-42px_rgba(6,63,43,0.42)] ring-1 ring-[#dfe7e1] sm:p-8">
            <div className="mb-7">
              <p className="text-sm font-semibold text-brand-700">Acesso reservado</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-dark">
                Bem-vindo de volta
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#68776f]">
                Entre com os dados associados à sua conta empresarial.
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                aria-live="polite"
                className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm font-semibold text-[#33443b]">
                  E-mail
                </Label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8a9890]" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nome@empresa.com"
                    className="h-12 rounded-xl border-[#d9e2dc] bg-[#fbfcfa] pl-11 text-base focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password" className="text-sm font-semibold text-[#33443b]">
                    Palavra-passe
                  </Label>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand-700 hover:text-brand-900"
                  >
                    Precisa de ajuda?
                  </a>
                </div>
                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8a9890]" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Introduza a sua palavra-passe"
                    className="h-12 rounded-xl border-[#d9e2dc] bg-[#fbfcfa] pl-11 pr-12 text-base focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#7b8b82] transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
                    aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="h-12 w-full gap-2 rounded-xl text-base">
                {loading ? 'A entrar...' : 'Entrar no BrandDesk'}
                {loading ? null : <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-5">
              <TestCredentialsButton currentPage="client" />
            </div>

            <div className="mt-6 border-t border-[#e7ece8] pt-6 text-center">
              <p className="text-sm text-[#68776f]">Ainda não tem acesso ao BrandDesk?</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <Link
                  href="/branddesk/demo"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900"
                >
                  Explorar a demonstração
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <span className="hidden text-[#c8d2cb] sm:inline" aria-hidden="true">·</span>
                <Link
                  href="/area-cliente/registo"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900"
                >
                  Criar conta de cliente
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-[#7b8981]">
            Os seus dados são utilizados apenas para gerir pedidos e comunicação com a Maputo Publicidade.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return <ClientLoginForm />;
}
