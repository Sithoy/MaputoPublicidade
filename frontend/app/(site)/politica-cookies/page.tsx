import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Política de cookies do site Maputo Publicidade.',
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-dark">Política de Cookies</h1>
      <div className="prose prose-sm max-w-none text-gray-700">
        <p>
          O site da Maputo Publicidade utiliza cookies para melhorar a experiência de navegação e
          analisar o tráfego.
        </p>
        <h2 className="mt-4 text-lg font-semibold">O que são cookies?</h2>
        <p>
          Cookies são pequenos ficheiros de texto armazenados no seu dispositivo quando visita um
          site. Permitem lembrar preferências e melhorar o funcionamento do site.
        </p>
        <h2 className="mt-4 text-lg font-semibold">Cookies utilizados</h2>
        <p>
          Utilizamos cookies essenciais para o funcionamento do site e cookies analíticos para
          compreender como os visitantes interagem com as páginas.
        </p>
        <h2 className="mt-4 text-lg font-semibold">Gestão de cookies</h2>
        <p>
          Pode gerir ou desactivar cookies através das configurações do seu navegador. Ao clicar em
          “Aceitar”, consente a utilização de cookies conforme descrito nesta política.
        </p>
      </div>
    </div>
  );
}
