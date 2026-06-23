import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-brand">404</h1>
      <p className="mt-4 text-xl text-dark">Página não encontrada</p>
      <p className="mt-2 text-gray-600">
        A página que procura não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md bg-brand px-6 py-3 text-white hover:bg-brand-600"
      >
        Voltar à página inicial
      </Link>
    </div>
  );
}
