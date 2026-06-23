'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-bold text-red-600">Erro</h1>
      <p className="mt-4 text-lg text-dark">Ocorreu um problema inesperado.</p>
      <p className="mt-2 text-sm text-gray-500">{error.message}</p>
      <button
        onClick={reset}
        className="mt-6 inline-flex rounded-md bg-brand px-6 py-3 text-white hover:bg-brand-600"
      >
        Tentar novamente
      </button>
    </div>
  );
}
