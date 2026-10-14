export type ServiceIconName = 'Shirt' | 'Printer' | 'Paintbrush' | 'Gift' | 'Crosshair' | 'Box';

export type MainService = {
  slug: string;
  categorySlug: string;
  iconName: ServiceIconName;
  title: string;
  eyebrow: string;
  summary: string;
  showcaseText: string;
  description: string;
  productsIntro: string;
  points: string[];
  image: string;
  imageAlt: string;
  outcome: string;
  benefits: Array<{
    title: string;
    text: string;
  }>;
  process: string[];
};

export type ServiceProductGroup = {
  title: string;
  description: string;
  productSlugs: string[];
  fallbackItems: string[];
};

export type ServiceCommercialDetails = {
  promise: string;
  idealFor: string[];
  deliverables: string[];
  quoteChecklist: string[];
  recommendedPackage: {
    label: string;
    title: string;
    description: string;
    productSlug: string;
    items: string[];
  };
  productGroups: ServiceProductGroup[];
};

export const mainServices: MainService[] = [
  {
    slug: 'serigrafia-e-bordado',
    categorySlug: 'serigrafia-e-bordado',
    iconName: 'Shirt',
    title: 'Serigrafia e Bordado',
    eyebrow: 'Uniformes que representam a sua marca',
    summary: 'Uniformes, polos, camisetas, bonés, coletes e sacolas com acabamento profissional.',
    showcaseText:
      'Uma equipa bem apresentada transmite confiança antes da primeira conversa. Este detalhe ilustrativo de um polo bordado representa o cuidado com o tecido, o posicionamento da marca e o acabamento de cada peça.',
    description:
      'Produzimos peças têxteis personalizadas para equipas, campanhas e merchandising, combinando serigrafia, bordado e seleção adequada de materiais para garantir presença visual e durabilidade.',
    productsIntro:
      'Produtos ligados à personalização têxtil para equipas, eventos e ações promocionais.',
    points: ['Polos', 'Bonés', 'Uniformes'],
    image: '/images/services/uniformes-premium.webp',
    imageAlt: 'Detalhe ilustrativo de um polo verde com bordado dourado e acabamento cuidado.',
    outcome: 'Dê à sua equipa uma imagem reconhecível, com peças confortáveis e personalização cuidada.',
    benefits: [
      { title: 'Acabamento resistente', text: 'Aplicações pensadas para uso frequente e lavagem regular.' },
      { title: 'Identidade consistente', text: 'Cores, posicionamento e materiais alinhados com a marca.' },
      { title: 'Produção para equipas', text: 'Soluções para pequenas séries e uniformização corporativa.' },
    ],
    process: ['Escolha da peça', 'Aprovação da arte', 'Produção e controlo de qualidade', 'Entrega final'],
  },
  {
    slug: 'grafica',
    categorySlug: 'grafica',
    iconName: 'Printer',
    title: 'Gráfica',
    eyebrow: 'Impressão que comunica com qualidade',
    summary: 'Folhetos, cartazes, catálogos, brochuras, envelopes, livros e cartões de visita.',
    showcaseText:
      'A apresentação da sua empresa também se sente no papel. Esta composição ilustrativa de uma brochura e cartões de visita destaca a impressão, a textura e o acabamento que tornam cada contacto mais profissional.',
    description:
      'Criamos e produzimos materiais gráficos para apresentar empresas, campanhas e produtos com acabamento limpo, leitura clara e consistência visual em todos os formatos.',
    productsIntro:
      'Produtos gráficos para comunicação institucional, comercial e promocional.',
    points: ['Catálogos', 'Cartões', 'Folhetos'],
    image: '/images/services/grafica-premium.webp',
    imageAlt: 'Composição ilustrativa de uma brochura e cartões de visita em verde e tons neutros.',
    outcome: 'Apresente a sua empresa com materiais impressos que dão clareza e credibilidade à sua mensagem.',
    benefits: [
      { title: 'Boa apresentação', text: 'Materiais com impacto visual e acabamento profissional.' },
      { title: 'Formatos variados', text: 'Produção adaptada a campanhas, escritórios, lojas e eventos.' },
      { title: 'Entrega objetiva', text: 'Fluxo de aprovação claro para reduzir retrabalho.' },
    ],
    process: ['Briefing do material', 'Preparação da arte', 'Prova e aprovação', 'Impressão e acabamento'],
  },
  {
    slug: 'impressao-digital-e-branding',
    categorySlug: 'impressao-digital-e-branding',
    iconName: 'Paintbrush',
    title: 'Impressão Digital e Branding',
    eyebrow: 'Marca visível em todos os pontos de contacto',
    summary: 'Rollups, teardrops, gazebos, placas, autocolantes, viaturas, lojas e eventos.',
    showcaseText:
      'Faça a sua marca acompanhar o percurso dos seus clientes. Esta viatura com aplicação gráfica ilustrativa mostra uma das formas de criar presença; adaptamos também a identidade a espaços, eventos e pontos de venda.',
    description:
      'Desenvolvemos peças de grande formato e aplicações de marca para espaços, viaturas, eventos e pontos de venda, com produção pensada para visibilidade, resistência e coerência visual.',
    productsIntro:
      'Produtos para promover a marca em espaços comerciais, viaturas, eventos e campanhas.',
    points: ['Rollups', 'Viaturas', 'Placas'],
    image: '/images/services/branding-premium.webp',
    imageAlt: 'Viatura branca com aplicação gráfica ilustrativa em verde, num ambiente exterior limpo.',
    outcome: 'Torne a sua empresa visível nos espaços, nas viaturas e nos momentos em que o cliente a encontra.',
    benefits: [
      { title: 'Presença forte', text: 'Peças que tornam a marca reconhecível à distância.' },
      { title: 'Aplicação versátil', text: 'Soluções para interior, exterior, eventos e circulação urbana.' },
      { title: 'Produção integrada', text: 'Do design final à impressão e montagem quando necessário.' },
    ],
    process: ['Levantamento do local ou formato', 'Adaptação da arte', 'Produção', 'Aplicação ou entrega'],
  },
  {
    slug: 'impressao-uv-e-brindes',
    categorySlug: 'impressao-uv-e-brindes',
    iconName: 'Gift',
    title: 'Impressão UV e Brindes',
    eyebrow: 'Brindes personalizados para valorizar a marca',
    summary: 'Impressão direta em diversos materiais e brindes corporativos personalizados.',
    showcaseText:
      'Uma oferta útil pode prolongar a relação com a sua marca. Este conjunto ilustrativo de uma garrafa e um caderno representa uma escolha cuidada de objetos, materiais e personalização para clientes e equipas.',
    description:
      'Personalizamos brindes e objetos promocionais com impressão UV direta, criando peças úteis, memoráveis e alinhadas com campanhas, eventos e relacionamento com clientes.',
    productsIntro:
      'Produtos promocionais e brindes para campanhas, eventos e oferta corporativa.',
    points: ['UV', 'Brindes', 'Premium'],
    image: '/images/services/brindes-premium.webp',
    imageAlt: 'Conjunto ilustrativo de uma garrafa verde e um caderno neutro com detalhe dourado.',
    outcome: 'Crie uma lembrança útil e bem pensada, que mantém a sua marca perto de clientes e parceiros.',
    benefits: [
      { title: 'Aplicação em materiais diversos', text: 'Impressão em objetos rígidos, brindes e superfícies especiais.' },
      { title: 'Boa lembrança de marca', text: 'Produtos úteis que mantêm a empresa presente no dia a dia.' },
      { title: 'Acabamento premium', text: 'Detalhes e cores que elevam a perceção do brinde.' },
    ],
    process: ['Escolha do brinde', 'Teste de posicionamento', 'Produção UV', 'Preparação para entrega'],
  },
  {
    slug: 'cortes-a-laser',
    categorySlug: 'cortes-a-laser',
    iconName: 'Crosshair',
    title: 'Cortes a Laser',
    eyebrow: 'Precisão que transforma ideias em peças únicas',
    summary: 'Cortes precisos em acrílico, MDF, madeira, couro, papel e plástico para peças únicas.',
    showcaseText:
      'Quando o detalhe faz a diferença, a precisão dá forma à ideia. Este painel de madeira recortado é uma aplicação ilustrativa; desenvolvemos também letras, placas, peças decorativas e protótipos a partir do seu desenho.',
    description:
      'Executamos corte e gravação a laser para peças decorativas, sinalização, brindes, protótipos e acabamentos especiais, com atenção à precisão, material e detalhe do desenho.',
    productsIntro:
      'Produtos e aplicações com corte ou gravação a laser para decoração, sinalização e brindes.',
    points: ['Acrílico', 'MDF', 'Precisão'],
    image: '/images/services/laser-premium.webp',
    imageAlt: 'Painel decorativo ilustrativo em madeira com recorte geométrico preciso.',
    outcome: 'Transforme uma ideia numa peça distinta, com cortes precisos e atenção ao desenho e ao material.',
    benefits: [
      { title: 'Alta precisão', text: 'Cortes detalhados para peças pequenas, letras, padrões e formas complexas.' },
      { title: 'Materiais variados', text: 'Acrílico, MDF, madeira, couro, papel, cartão e plásticos compatíveis.' },
      { title: 'Design personalizado', text: 'Produção baseada no desenho, medida e acabamento pretendidos.' },
    ],
    process: ['Receção do desenho', 'Validação do material', 'Corte ou gravação', 'Acabamento final'],
  },
  {
    slug: 'paineis-3d',
    categorySlug: 'paineis-3d',
    iconName: 'Box',
    title: 'Painéis em 3D',
    eyebrow: 'Ambientes com profundidade, marca e presença',
    summary: 'Painéis decorativos, letras caixa, sinalização 3D e acabamentos para interiores e fachadas.',
    showcaseText:
      'Um espaço pode representar a sua empresa com presença e personalidade. Esta aplicação tridimensional ilustrativa destaca o volume e os materiais que usamos para pensar receções, lojas, escritórios e fachadas.',
    description:
      'Criamos painéis, letras caixa e elementos tridimensionais para receções, lojas, escritórios e fachadas, combinando materiais, iluminação e instalação para reforçar a identidade do espaço.',
    productsIntro:
      'Produtos para sinalização, decoração e presença de marca em interiores e exteriores.',
    points: ['3D', 'Letras caixa', 'Interiores'],
    image: '/images/services/paineis-premium.webp',
    imageAlt: 'Aplicação tridimensional ilustrativa em verde e dourado sobre uma parede clara.',
    outcome: 'Faça do seu espaço um ponto de identidade, com volume, materiais e sinalização à medida.',
    benefits: [
      { title: 'Impacto visual', text: 'Elementos com volume e acabamento que destacam a marca no espaço.' },
      { title: 'Interior e exterior', text: 'Soluções adaptadas a receções, fachadas, paredes e ambientes comerciais.' },
      { title: 'Instalação cuidada', text: 'Planeamento de medidas, fixação e iluminação quando aplicável.' },
    ],
    process: ['Briefing do espaço', 'Desenho 3D e aprovação', 'Fabricação', 'Instalação especializada'],
  },
];

export function getMainService(slug: string) {
  return mainServices.find((service) => service.slug === slug);
}

export const serviceCommercialDetails: Record<string, ServiceCommercialDetails> = {
  'serigrafia-e-bordado': {
    promise:
      'Transformamos peças têxteis em presença de marca: uniformes para equipa, merchandising para eventos e brindes que continuam úteis depois da campanha.',
    idealFor: ['Equipas comerciais e operacionais', 'Eventos e ativações de marca', 'Restaurantes, escolas e empresas de serviços'],
    deliverables: ['Arte posicionada por peça', 'Opções de tecido e cores', 'Produção por tamanhos', 'Controlo de acabamento'],
    quoteChecklist: ['Tipo de peça e cor pretendida', 'Quantidade por tamanho', 'Logotipo em vetor ou imagem', 'Prazo e local de entrega'],
    recommendedPackage: {
      label: 'Pacote de entrada',
      title: 'Kit Uniforme Corporativo',
      description:
        'Uma combinação prática para equipas que precisam aparecer de forma consistente sem complicar o briefing.',
      productSlug: 'camisetas-personalizadas',
      items: ['Camisetas ou polos personalizados', 'Bonés bordados opcionais', 'Aplicação do logotipo', 'Separação por tamanhos'],
    },
    productGroups: [
      {
        title: 'Vestuário de equipa',
        description: 'Peças para uso diário, ações comerciais e equipas de atendimento.',
        productSlugs: ['camisetas-personalizadas'],
        fallbackItems: ['Polos', 'Camisetas', 'Coletes', 'Aventais'],
      },
      {
        title: 'Acessórios personalizados',
        description: 'Complementos úteis para campanhas, eventos e identificação de equipa.',
        productSlugs: ['bones-bordados'],
        fallbackItems: ['Bonés bordados', 'Sacos', 'Mochilas', 'Lenços'],
      },
    ],
  },
  grafica: {
    promise:
      'Organizamos a comunicação impressa da sua empresa com peças que têm boa leitura, acabamento profissional e coerência visual entre si.',
    idealFor: ['Apresentações comerciais', 'Campanhas promocionais', 'Papelaria institucional e eventos'],
    deliverables: ['Preparação para impressão', 'Sugestão de papel e acabamento', 'Prova para aprovação', 'Produção final organizada'],
    quoteChecklist: ['Formato e quantidade', 'Tipo de papel ou acabamento', 'Arte final ou conteúdo', 'Data em que precisa receber'],
    recommendedPackage: {
      label: 'Pacote comercial',
      title: 'Kit Apresentação de Empresa',
      description:
        'Base ideal para empresas que precisam entregar uma imagem mais cuidada em reuniões, propostas e contactos comerciais.',
      productSlug: 'cartoes-de-visita',
      items: ['Cartões de visita', 'Folhetos ou flyers', 'Pasta ou catálogo simples', 'Ajuste de arte final'],
    },
    productGroups: [
      {
        title: 'Papelaria e contacto',
        description: 'Materiais essenciais para apresentação profissional no dia a dia.',
        productSlugs: ['cartoes-de-visita'],
        fallbackItems: ['Cartões de visita', 'Envelopes', 'Papel timbrado', 'Pastas'],
      },
      {
        title: 'Campanhas impressas',
        description: 'Peças para divulgar produtos, serviços, eventos e campanhas comerciais.',
        productSlugs: [],
        fallbackItems: ['Folhetos', 'Cartazes', 'Catálogos', 'Brochuras'],
      },
    ],
  },
  'impressao-digital-e-branding': {
    promise:
      'Levamos a marca para espaços, viaturas e eventos com materiais de grande formato pensados para visibilidade, resistência e montagem real.',
    idealFor: ['Lojas e pontos de venda', 'Viaturas comerciais', 'Feiras, eventos e ativações'],
    deliverables: ['Adaptação da arte ao formato', 'Impressão e acabamento', 'Orientação de aplicação', 'Instalação quando aplicável'],
    quoteChecklist: ['Medidas do espaço ou viatura', 'Fotografias do local', 'Tipo de material pretendido', 'Prazo e condição de montagem'],
    recommendedPackage: {
      label: 'Pacote visibilidade',
      title: 'Kit Presença em Evento',
      description:
        'Uma seleção equilibrada para marcas que precisam aparecer bem num evento, lançamento ou campanha temporária.',
      productSlug: 'rollups',
      items: ['Rollup ou banner principal', 'Autocolantes de apoio', 'Sinalização de mesa ou balcão', 'Preparação da arte'],
    },
    productGroups: [
      {
        title: 'Eventos e campanhas',
        description: 'Estruturas e materiais de impacto para ambientes temporários.',
        productSlugs: ['rollups', 'gazebos-e-stands'],
        fallbackItems: ['Rollups', 'Teardrops', 'Gazebos', 'Bandeiras'],
      },
      {
        title: 'Espaços e viaturas',
        description: 'Soluções para transformar pontos físicos em pontos de marca.',
        productSlugs: ['autocolantes', 'branding-de-viaturas'],
        fallbackItems: ['Autocolantes', 'Placas', 'Branding de viaturas', 'Branding de lojas'],
      },
    ],
  },
  'impressao-uv-e-brindes': {
    promise:
      'Criamos objetos personalizados com acabamento cuidado para campanhas, ofertas corporativas e ações de relacionamento com clientes.',
    idealFor: ['Brindes corporativos', 'Lançamentos de produto', 'Presentes para clientes e equipas'],
    deliverables: ['Sugestão de objetos', 'Teste de posicionamento', 'Impressão direta UV', 'Separação para entrega'],
    quoteChecklist: ['Tipo de objeto ou material', 'Quantidade por modelo', 'Dimensão da marca', 'Uso final do brinde'],
    recommendedPackage: {
      label: 'Pacote relacionamento',
      title: 'Kit Brindes de Marca',
      description:
        'Boa opção para empresas que querem oferecer peças úteis e memoráveis sem perder consistência visual.',
      productSlug: 'placas-de-identificacao',
      items: ['Seleção de brindes úteis', 'Impressão UV direta', 'Caixas ou preparação simples', 'Controlo de qualidade visual'],
    },
    productGroups: [
      {
        title: 'Brindes úteis',
        description: 'Objetos de uso frequente que mantêm a marca presente no dia a dia.',
        productSlugs: [],
        fallbackItems: ['Canecas', 'Garrafas', 'Cadernos', 'Chaveiros'],
      },
      {
        title: 'Objetos e placas',
        description: 'Peças rígidas com personalização direta e acabamento mais premium.',
        productSlugs: ['placas-de-identificacao'],
        fallbackItems: ['Placas', 'Acrílicos', 'Metal', 'PVC'],
      },
    ],
  },
  'cortes-a-laser': {
    promise:
      'Produzimos peças detalhadas com cortes limpos e gravação precisa para decoração, sinalização, brindes especiais e protótipos.',
    idealFor: ['Peças decorativas e brindes', 'Sinalização personalizada', 'Protótipos e detalhes de acabamento'],
    deliverables: ['Validação do ficheiro de corte', 'Sugestão de material', 'Corte ou gravação', 'Acabamento e separação das peças'],
    quoteChecklist: ['Ficheiro vetorial ou desenho', 'Material e espessura', 'Medidas finais', 'Quantidade e acabamento desejado'],
    recommendedPackage: {
      label: 'Pacote sob medida',
      title: 'Kit Peças Personalizadas',
      description:
        'Indicado para projetos que precisam de detalhe, pequeno volume e acabamento diferenciado em materiais rígidos.',
      productSlug: 'corte-em-acrilico',
      items: ['Corte em acrílico ou MDF', 'Gravação personalizada', 'Teste de encaixe quando necessário', 'Acabamento final'],
    },
    productGroups: [
      {
        title: 'Corte técnico',
        description: 'Peças com forma precisa para sinalização, decoração e montagem.',
        productSlugs: ['corte-em-acrilico', 'corte-em-mdf'],
        fallbackItems: ['Acrílico', 'MDF', 'Madeira', 'Papel especial'],
      },
      {
        title: 'Gravação e detalhe',
        description: 'Personalização fina para brindes, placas e peças de apresentação.',
        productSlugs: ['gravacao-personalizada'],
        fallbackItems: ['Gravação em madeira', 'Gravação em couro', 'Placas acrílicas', 'Convites especiais'],
      },
    ],
  },
  'paineis-3d': {
    promise:
      'Desenhamos presença permanente para a marca com volume, materiais adequados e instalação pensada para receções, lojas, escritórios e fachadas.',
    idealFor: ['Receções e escritórios', 'Fachadas e lojas', 'Paredes de destaque e sinalização interna'],
    deliverables: ['Levantamento de medidas', 'Proposta visual ou desenho 3D', 'Produção das peças', 'Instalação e acabamento'],
    quoteChecklist: ['Fotografias e medidas do espaço', 'Tipo de parede ou fachada', 'Preferência de material', 'Necessidade de iluminação'],
    recommendedPackage: {
      label: 'Pacote presença',
      title: 'Kit Receção com Letras Caixa',
      description:
        'Solução forte para transformar a entrada da empresa num ponto de identidade visual permanente.',
      productSlug: 'letras-caixa-3d',
      items: ['Letras caixa com acabamento premium', 'Painel de fundo opcional', 'Iluminação opcional', 'Instalação especializada'],
    },
    productGroups: [
      {
        title: 'Identidade em volume',
        description: 'Elementos principais para dar presença física à marca.',
        productSlugs: ['letras-caixa-3d', 'sinalizacao-interior-3d'],
        fallbackItems: ['Letras caixa', 'Logotipos 3D', 'Sinalização interior', 'Placas de orientação'],
      },
      {
        title: 'Ambientes e paredes',
        description: 'Acabamentos decorativos para criar impacto no espaço.',
        productSlugs: ['painel-decorativo-3d'],
        fallbackItems: ['Painel ripado', 'Painel decorativo 3D', 'ACM', 'PVC expandido'],
      },
    ],
  },
};

export function getServiceCommercialDetails(slug: string) {
  return serviceCommercialDetails[slug];
}
