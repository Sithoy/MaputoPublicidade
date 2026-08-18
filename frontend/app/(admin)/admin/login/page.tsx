'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Eye,
  EyeOff,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { TestCredentialsButton } from '@/components/TestCredentialsButton';
import { login, removeToken } from '@/lib/auth';

const adminBenefits = [
  {
    icon: LayoutDashboard,
    title: 'Operação centralizada',
    description: 'Acompanhe pedidos, orçamentos e pagamentos num único painel.',
  },
  {
    icon: Boxes,
    title: 'Conteúdo atualizado',
    description: 'Faça a gestão do catálogo, portfólio e parceiros da marca.',
  },
  {
    icon: Users,
    title: 'Acesso controlado',
    description: 'Administre utilizadores e mantenha a informação protegida.',
  },
];

export default function AdminLoginPage() {
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
      const data = await login(
        formData.get('email') as string,
        formData.get('password') as string
      );
      const user = data.data?.user;

      if (!user?.is_staff) {
        removeToken();
        setError('Esta conta não tem permissões de administrador.');
        return;
      }

      router.push('/admin');
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
            Acesso administrativo
          </div>

          <h1 className="mt-6 max-w-xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-dark sm:text-5xl lg:text-[3.55rem]">
            A operação da MP, organizada num só lugar.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#5d6d65] sm:text-lg">
            Uma visão clara do negócio para a equipa gerir clientes, produção e conteúdo com mais rapidez e consistência.
          </p>

          <div className="mt-9 hidden gap-3 sm:grid sm:grid-cols-3 lg:max-w-2xl">
            {adminBenefits.map((benefit) => {
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
              Área reservada à equipa
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brand" />
              Gestão segura e centralizada
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[470px] lg:mr-0">
          <div className="rounded-[28px] border border-white bg-white/95 p-5 shadow-[0_28px_80px_-42px_rgba(6,63,43,0.42)] ring-1 ring-[#dfe7e1] sm:p-8">
            <div className="mb-7">
              <p className="text-sm font-semibold text-brand-700">Administração</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-dark">
                Bem-vindo de volta
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#68776f]">
                Entre com uma conta autorizada da equipa Maputo Publicidade.
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
                    placeholder="nome@maputopublicidade.com"
                    className="h-12 rounded-xl border-[#d9e2dc] bg-[#fbfcfa] pl-11 text-base focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-[#33443b]">
                  Palavra-passe
                </Label>
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
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="h-12 w-full gap-2 rounded-xl text-base">
                {loading ? 'A entrar...' : 'Entrar na administração'}
                {loading ? null : <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-5">
              <TestCredentialsButton currentPage="admin" />
            </div>

            <div className="mt-6 border-t border-[#e7ece8] pt-6 text-center">
              <p className="text-xs leading-5 text-[#7b8981]">
                Este acesso é exclusivo para utilizadores autorizados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
