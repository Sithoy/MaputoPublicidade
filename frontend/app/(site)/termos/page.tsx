import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de uso do site Maputo Publicidade.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-dark">Termos de Uso</h1>
      <div className="prose prose-sm max-w-none text-gray-700">
        <p>
          Ao aceder e utilizar o site da Maputo Publicidade, aceita cumprir estes termos. Se não
          concordar, por favor não utilize o site.
        </p>
        <h2 className="mt-4 text-lg font-semibold">1. Serviços</h2>
        <p>
          Prestamos serviços de publicidade, gráfica, serigrafia, impressão digital e brindes
          corporativos. Os preços e prazos são indicativos e sujeitos a confirmação por orçamento.
        </p>
        <h2 className="mt-4 text-lg font-semibold">2. Orçamentos e Encomendas</h2>
        <p>
          Os orçamentos são válidos pelo prazo indicado. A encomenda só é iniciada após aprovação do
          orçamento e, quando aplicável, recebimento do pagamento.
        </p>
        <h2 className="mt-4 text-lg font-semibold">3. Propriedade Intelectual</h2>
        <p>
          Todo o conteúdo do site é propriedade da Maputo Publicidade ou dos seus parceiros. É
          proibida a reprodução sem autorização.
        </p>
        <h2 className="mt-4 text-lg font-semibold">4. Limitação de Responsabilidade</h2>
        <p>
          A Maputo Publicidade não se responsabiliza por danos indirectos resultantes do uso do site
          ou de atrasos causados por factores externos.
        </p>
      </div>
    </div>
  );
}
