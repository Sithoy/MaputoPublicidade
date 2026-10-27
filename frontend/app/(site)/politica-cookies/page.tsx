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
          Os mecanismos essenciais suportam a sessão e o funcionamento do site. A análise do
          website só é ativada quando escolhe “Permitir análise”. Escolher “Apenas essenciais”
          não limita os serviços do website. Uma aceitação antiga não ativa esta análise.
        </p>
        <h2 className="mt-4 text-lg font-semibold">Gestão de cookies</h2>
        <p>
          Pode mudar a sua escolha em “Preferências de privacidade”, no final das páginas públicas.
          Ao recusar, deixamos de enviar novos eventos e removemos os identificadores analíticos
          deste navegador. Respeitamos os sinais Do Not Track e Global Privacy Control.
        </p>
        <h2 className="mt-4 text-lg font-semibold">Análise opcional do website</h2>
        <p>A medição usa armazenamento local, não cookies analíticos: uma escolha de consentimento,
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
      </div>
    </div>
  );
}
