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
          O site da Maputo Publicidade utiliza mecanismos essenciais de navegação e duas camadas
          separadas de medição, descritas abaixo.
        </p>
        <h2 className="mt-4 text-lg font-semibold">O que são cookies?</h2>
        <p>
          Cookies são pequenos ficheiros de texto armazenados no seu dispositivo quando visita um
          site. Permitem lembrar preferências e melhorar o funcionamento do site.
        </p>
        <h2 className="mt-4 text-lg font-semibold">Cookies utilizados</h2>
        <p>
          Os mecanismos essenciais suportam a sessão e o funcionamento do site. As preferências
          de medição são guardadas para respeitar a sua escolha; não são identificadores de visitante.
          A análise detalhada só é ativada quando escolhe “Aceitar todos” ou guarda “Permitir todas” em “Personalizar”. Os serviços
          continuam disponíveis independentemente da escolha. Uma aceitação antiga não ativa a análise detalhada.
        </p>
        <h2 className="mt-4 text-lg font-semibold">Gestão de cookies</h2>
        <p>
          Pode mudar a sua escolha em “Preferências de privacidade”, no final das páginas públicas.
          Em “Personalizar”, “Só estatísticas anónimas” remove os identificadores analíticos e mantém apenas totais sem
          ligação entre visitas. “Rejeitar opcionais” ou guardar “Não permitir estatísticas” interrompe toda a medição de visitas descrita nesta política.
          Respeitamos os sinais Do Not Track e Global Privacy Control em ambas as camadas.
          Uma recusa anterior à separação das camadas continua a interromper a medição até rever a escolha.
        </p>
        <h2 className="mt-4 text-lg font-semibold">Contagens públicas agregadas</h2>
        <p>Por predefinição, contamos páginas públicas, cliques nos principais botões e envios de
          pedidos confirmados no navegador. Enviamos apenas o tipo de ação e o caminho público,
          sem parâmetros. O servidor soma totais por dia, página e ação; não conserva um registo
          individual destes pedidos nem identificadores, origem, dimensão do ecrã ou ligações entre visitas.
          Não usamos cookies, armazenamento de identificadores ou impressão digital do dispositivo
          para estas contagens. Pode desativá-las nas preferências.</p>
        <h2 className="mt-4 text-lg font-semibold">Análise opcional do website</h2>
        <p>Apenas a análise detalhada autorizada usa armazenamento local, não cookies analíticos: uma escolha de consentimento,
          um identificador aleatório de visitante com validade de 30 dias e uma sessão no separador
          que expira após 30 minutos sem eventos. Recolhemos páginas públicas, origem agrupada,
          dimensão do ecrã e ações como cliques WhatsApp e confirmação de pedidos. Um registo de
          conta só é contado se vier de uma visita pública autorizada na mesma sessão; não enviamos
          nome, email ou dados da conta para a análise.</p>
        <p>Não guardamos IPs ou o agente do navegador na base de dados analítica, conteúdo de mensagens,
          parâmetros das páginas, endereços completos de referência ou links privados. O relatório
          abrange 90 dias. Uma limpeza diária é acionada durante recolhas e consultas para remover
          eventos mais antigos; sem atividade, estes aguardam a próxima limpeza. A infraestrutura
          de alojamento pode ter os seus próprios registos operacionais, separados desta análise.</p>
        <h2 className="mt-4 text-lg font-semibold">Segurança e funcionamento do serviço</h2>
        <p>A monitorização técnica de falhas, abuso e tentativas de acesso não autorizado é separada
          das estatísticas de visitas. Não é desativada pelos botões de análise ou pelos sinais Do Not Track/GPC.
          Não usamos esta monitorização para criar perfis de navegação. Consulte os dados e prazos na{' '}
          <a href="/privacidade" className="font-medium text-brand underline">Política de Privacidade</a>.</p>
      </div>
    </div>
  );
}
