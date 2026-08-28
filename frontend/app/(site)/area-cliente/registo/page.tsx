'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { registerClient } from '@/lib/auth';

const signupBenefits = [
  'Submeta pedidos e acompanhe a produção',
  'Aprove propostas e provas num só lugar',
  'Mantenha o histórico da sua marca organizado',
];

const inputClass =
  'h-12 rounded-xl border-[#d9e2dc] bg-[#fbfcfa] pl-11 text-base focus:bg-white';

export default function ClientRegistrationPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') || '');
    const passwordConfirm = String(formData.get('password_confirm') || '');

    if (password !== passwordConfirm) {
      setError('As palavras-passe devem ser iguais.');
      return;
    }

    setLoading(true);
    try {
      await registerClient({
        firstName: String(formData.get('first_name') || ''),
        lastName: String(formData.get('last_name') || ''),
        company: String(formData.get('company') || ''),
        phone: String(formData.get('phone') || ''),
        nuit: String(formData.get('nuit') || ''),
        email: String(formData.get('email') || ''),
        password,
        passwordConfirm,
        acceptTerms: formData.get('accept_terms') === 'on',
      });
      router.push('/area-cliente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f7f9f5]">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[#f4f0e8] blur-3xl" />

      <header className="relative z-20">
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
            href="/area-cliente/login"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#53635a] transition hover:bg-white/70 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Já tenho conta
          </Link>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:px-6 lg:pb-24 lg:pt-14">
        <section className="max-w-xl lg:sticky lg:top-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-800 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            BrandDesk
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-dark sm:text-5xl">
            A sua marca começa aqui.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#5d6d65] sm:text-lg">
            Crie o seu espaço de cliente e trabalhe com a equipa Maputo Publicidade de forma simples, clara e segura.
          </p>

          <ul className="mt-8 hidden space-y-4 sm:block" aria-label="Vantagens do BrandDesk">
            {signupBenefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-[#53635a]">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-9 hidden rounded-2xl border border-[#dfe7e1] bg-white/70 p-5 text-sm leading-6 text-[#68776f] shadow-[0_16px_44px_-36px_rgba(6,63,43,0.45)] sm:block">
            <p className="font-semibold text-dark">Conta segura e exclusivamente de cliente</p>
            <p className="mt-1">Os dados da sua empresa ajudam-nos a preparar propostas e documentos com menos trocas de mensagens.</p>
          </div>
        </section>

        <section className="w-full rounded-[28px] border border-white bg-white/95 p-5 shadow-[0_28px_80px_-42px_rgba(6,63,43,0.42)] ring-1 ring-[#dfe7e1] sm:p-8 lg:p-10">
          <div className="mb-7">
            <p className="text-sm font-semibold text-brand-700">Nova conta de cliente</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-dark">
              Criar acesso ao BrandDesk
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#68776f]">
              Os campos marcados são necessários para identificar a sua conta.
            </p>
          </div>

          {error ? (
            <div role="alert" aria-live="polite" className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-7">
            <fieldset>
              <legend className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#77867e]">
                Responsável pela conta
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="first_name" name="first_name" label="Nome" icon={UserRound} autoComplete="given-name" required />
                <Field id="last_name" name="last_name" label="Apelido" icon={UserRound} autoComplete="family-name" required />
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#77867e]">
                Empresa
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="company" name="company" label="Empresa (opcional)" icon={Building2} autoComplete="organization" />
                <Field id="nuit" name="nuit" label="NUIT (opcional)" icon={Building2} inputMode="numeric" />
                <div className="sm:col-span-2">
                  <Field id="phone" name="phone" label="Telefone (opcional)" icon={Phone} type="tel" autoComplete="tel" placeholder="+258 84 000 0000" />
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#77867e]">
                Dados de acesso
              </legend>
              <div className="space-y-5">
                <Field id="email" name="email" label="E-mail" icon={Mail} type="email" autoComplete="email" placeholder="nome@empresa.com" required />
                <div className="grid gap-5 sm:grid-cols-2">
                  <PasswordField id="password" name="password" label="Palavra-passe" showPassword={showPassword} onToggle={() => setShowPassword((current) => !current)} />
                  <PasswordField id="password_confirm" name="password_confirm" label="Confirmar palavra-passe" showPassword={showPassword} onToggle={() => setShowPassword((current) => !current)} />
                </div>
                <p className="text-xs leading-5 text-[#7b8981]">Use pelo menos 8 caracteres e evite palavras-passe comuns.</p>
              </div>
            </fieldset>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e0e7e2] bg-[#fafbf9] p-4 text-sm leading-6 text-[#5d6d65]">
              <input name="accept_terms" type="checkbox" required className="mt-1 h-4 w-4 rounded border-[#b8c5bd] text-brand-700 focus:ring-brand/30" />
              <span>
                Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-brand-700 hover:text-brand-900">Termos de utilização</Link> e a <Link href="/privacidade" target="_blank" className="font-semibold text-brand-700 hover:text-brand-900">Política de privacidade</Link>.
              </span>
            </label>

            <Button type="submit" disabled={loading} className="h-12 w-full gap-2 rounded-xl text-base">
              {loading ? 'A criar a sua conta...' : 'Criar conta e entrar'}
              {loading ? null : <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 border-t border-[#e7ece8] pt-6 text-center text-sm text-[#68776f]">
            Já tem uma conta?{' '}
            <Link href="/area-cliente/login" className="font-semibold text-brand-700 hover:text-brand-900">
              Entrar no BrandDesk
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

type FieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function Field({ id, label, icon: Icon, className, ...props }: FieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-semibold text-[#33443b]">{label}</Label>
      <div className="relative mt-2">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8a9890]" />
        <Input id={id} className={`${inputClass} ${className || ''}`} {...props} />
      </div>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  showPassword: boolean;
  onToggle: () => void;
};

function PasswordField({ id, name, label, showPassword, onToggle }: PasswordFieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-semibold text-[#33443b]">{label}</Label>
      <div className="relative mt-2">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8a9890]" />
        <Input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={8}
          className={`${inputClass} pr-12`}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#7b8b82] transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
          aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
        >
          {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );
}
