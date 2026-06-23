import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Política de privacidade do site Maputo Publicidade.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-dark">Política de Privacidade</h1>
      <div className="prose prose-sm max-w-none text-gray-700">
        <p>
          A Maputo Publicidade valoriza a privacidade dos seus utilizadores. Esta política explica
          como recolhemos, usamos e protegemos os seus dados pessoais.
        </p>
        <h2 className="mt-4 text-lg font-semibold">1. Dados recolhidos</h2>
        <p>
          Recolhemos nome, email, telefone, empresa e informações sobre os pedidos de orçamento e
          encomendas. Estes dados são necessários para prestar os nossos serviços.
        </p>
        <h2 className="mt-4 text-lg font-semibold">2. Uso dos dados</h2>
        <p>
          Os dados são utilizados para responder a orçamentos, processar encomendas, comunicar sobre
          o estado dos trabalhos e enviar informações relacionadas com os serviços contratados.
        </p>
        <h2 className="mt-4 text-lg font-semibold">3. Partilha de dados</h2>
        <p>
          Não vendemos nem partilhamos dados pessoais com terceiros, exceto quando necessário para
          cumprimento legal ou prestação de serviços (ex: transporte de entregas).
        </p>
        <h2 className="mt-4 text-lg font-semibold">4. Segurança</h2>
        <p>
          Adoptamos medidas técnicas e organizativas para proteger os dados contra acesso não
          autorizado, perda ou destruição.
        </p>
        <h2 className="mt-4 text-lg font-semibold">5. Direitos do utilizador</h2>
        <p>
          Pode solicitar acesso, rectificação ou eliminação dos seus dados pessoais através do
          email maputopublicidade@outlook.com.
        </p>
      </div>
    </div>
  );
}
