'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchSocialProviders, type SocialProvider } from '@/lib/auth';

const providerLabels: Record<SocialProvider, string> = {
  google: 'Continuar com Google',
  microsoft: 'Continuar com Microsoft',
};

export function SocialLoginButtons() {
  const [providers, setProviders] = useState<SocialProvider[]>([]);

  useEffect(() => {
    let active = true;
    fetchSocialProviders().then((available) => {
      if (active) setProviders(available);
    });
    return () => {
      active = false;
    };
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map((provider) => (
          <a
            key={provider}
            href={`/auth/social/${provider}`}
            className="inline-flex h-12 items-center justify-center gap-3 rounded-xl border border-[#d9e2dc] bg-white px-4 text-sm font-semibold text-[#33443b] shadow-sm transition hover:border-brand-200 hover:bg-brand-50/50 focus:outline-none focus:ring-2 focus:ring-brand/25"
          >
            {provider === 'google' ? <GoogleIcon /> : <MicrosoftIcon />}
            {providerLabels[provider]}
          </a>
        ))}
      </div>

      <p className="mt-3 text-center text-[11px] leading-5 text-[#839088]">
        Ao continuar, aceita os{' '}
        <Link href="/termos" target="_blank" className="font-semibold text-brand-700">
          Termos
        </Link>{' '}
        e a{' '}
        <Link href="/privacidade" target="_blank" className="font-semibold text-brand-700">
          Política de privacidade
        </Link>
        .
      </p>

      <div className="mt-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#e3e9e5]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9890]">
          ou use o e-mail
        </span>
        <span className="h-px flex-1 bg-[#e3e9e5]" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.24-.2-1.8h-9.2v3.34h5.4a4.7 4.7 0 0 1-2 3.02l-.03.11 2.9 2.2.2.02c1.86-1.72 2.93-4.25 2.93-6.89Z" />
      <path fill="#34A853" d="M12.2 21.8c2.65 0 4.88-.87 6.5-2.68l-3.1-2.33a5.8 5.8 0 0 1-8.63-3.05l-.1.01-3.02 2.34-.04.1A9.8 9.8 0 0 0 12.2 21.8Z" />
      <path fill="#FBBC05" d="M6.97 13.74a6.04 6.04 0 0 1 0-3.88l-.01-.12-3.06-2.38-.1.05a9.83 9.83 0 0 0 0 8.78l3.17-2.45Z" />
      <path fill="#EA4335" d="M12.2 5.75c1.84 0 3.08.8 3.79 1.46l2.77-2.7A9.45 9.45 0 0 0 12.2 1.8a9.8 9.8 0 0 0-8.4 5.61l3.17 2.45a5.84 5.84 0 0 1 5.23-4.11Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}
