import type { Metadata } from 'next';
import { companyProfile, mailtoHref } from '@/lib/company';

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
          email{' '}
          <a href={mailtoHref()} className="font-medium text-brand hover:underline">
            {companyProfile.email}
          </a>
          .
        </p>
        <h2 className="mt-4 text-lg font-semibold">6. Medição de utilização do website</h2>
        <p>Para melhorar o website, somamos contagens por dia, página pública e ação, sem identificar
          visitantes nem ligar visitas entre si. Apenas a análise detalhada autorizada usa identificadores
          aleatórios de navegador e sessão para estimar visitantes e percursos. Os dados de contas,
          mensagens, documentos e encomendas não são associados aos dados analíticos.</p>
        <p>Pode escolher apenas contagens agregadas ou desativar todas as estatísticas de visitas em “Preferências de
          privacidade”, no final das páginas públicas. Respeitamos os sinais Do Not Track e Global Privacy
          Control para estas estatísticas. Os identificadores opcionais têm validade de 30 dias para visitantes e 30 minutos
          sem eventos para a sessão; o relatório abrange 90 dias. Consulte os detalhes de armazenamento,
          retenção e limpeza na <a href="/politica-cookies" className="font-medium text-brand underline">Política de Cookies</a>.</p>
        <h2 className="mt-4 text-lg font-semibold">7. Monitorização técnica de segurança e funcionamento</h2>
        <p>Separadamente das estatísticas de visitas, registamos falhas, limites de utilização e tentativas
          de acesso recusadas para proteger o serviço e investigar problemas. Esta monitorização não depende
          da aceitação da análise de visitas e não é desativada pelos sinais Do Not Track/GPC.</p>
        <p>A base de monitorização da aplicação guarda referências técnicas de pedidos, nomes de rotas,
          estados das respostas, contagens e tempos de processamento. Não guarda palavras-passe, tokens,
          conteúdos de mensagens ou documentos, IPs ou identificadores de visitante. Não criamos perfis de
          navegação com estes registos. O acesso está limitado à equipa administrativa autorizada.</p>
        <p>Os grupos de incidentes são elegíveis para eliminação após 14 dias; os contadores e registos de
          alerta, após 30 dias. A limpeza é acionada pela atividade, no máximo uma vez por dia; sem atividade,
          os dados aguardam a próxima execução. O histórico de notificações internas tem um ciclo próprio.
          Os fornecedores de alojamento podem manter logs operacionais separados, com regras e prazos próprios.</p>
      </div>
    </div>
  );
}
