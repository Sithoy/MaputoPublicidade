'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { exchangeSocialSession } from '@/lib/auth';

export default function SocialAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    const providerError = new URLSearchParams(window.location.search).get('error');
    if (providerError) {
      setError('A autenticação foi cancelada ou não pôde ser concluída.');
      return;
    }

    exchangeSocialSession()
      .then((data) => {
        const user = data.data?.user;
        if (user?.is_staff) {
          router.replace('/admin');
        } else if (!user?.profile?.company) {
          router.replace('/area-cliente/perfil?primeiro_acesso=1');
        } else {
          router.replace('/area-cliente');
        }
      })
      .catch((reason) => {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Não foi possível concluir o início de sessão.'
        );
      });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f4] px-4">
      <section className="w-full max-w-md rounded-[28px] border border-[#dfe7e1] bg-white p-8 text-center shadow-[0_28px_80px_-42px_rgba(6,63,43,0.42)] sm:p-10">
        <Image
          src="/logo-tight.png"
          alt="Maputo Publicidade"
          width={132}
          height={48}
          className="mx-auto h-10 w-auto object-contain"
          priority
        />

        {error ? (
          <>
            <div className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.025em] text-dark">
              Não foi possível entrar
            </h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-[#68776f]">
              {error}
            </p>
            <Link
              href="/area-cliente/login"
              className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-brand-800 px-5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Voltar ao início de sessão
            </Link>
          </>
        ) : (
          <div role="status" aria-live="polite">
            <LoaderCircle className="mx-auto mt-8 h-9 w-9 animate-spin text-brand-700" />
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.025em] text-dark">
              A preparar o BrandDesk
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#68776f]">
              Estamos a validar a sua conta e a organizar o espaço da sua marca.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
