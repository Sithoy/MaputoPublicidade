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
  benefits: Array<{
    title: string;
    text: string;
  }>;
  process: string[];
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
      'Esta área é para empresas que querem equipas reconhecíveis, campanhas mais organizadas e peças têxteis que continuem a representar a marca depois do primeiro uso. A imagem reúne os principais formatos de uniforme e merchandising que normalmente combinamos num mesmo projeto.',
    description:
      'Produzimos peças têxteis personalizadas para equipas, campanhas e merchandising, combinando serigrafia, bordado e seleção adequada de materiais para garantir presença visual e durabilidade.',
    productsIntro:
      'Produtos ligados à personalização têxtil para equipas, eventos e ações promocionais.',
    points: ['Polos', 'Bonés', 'Uniformes'],
    image: '/images/supplied/serigrafia-bordado.png',
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
      'A gráfica é o ponto onde a apresentação da marca ganha forma física: propostas, catálogos, cartões, brochuras e peças comerciais com leitura clara e acabamento cuidado. A imagem mostra como diferentes materiais podem trabalhar juntos para transmitir uma comunicação mais profissional.',
    description:
      'Criamos e produzimos materiais gráficos para apresentar empresas, campanhas e produtos com acabamento limpo, leitura clara e consistência visual em todos os formatos.',
    productsIntro:
      'Produtos gráficos para comunicação institucional, comercial e promocional.',
    points: ['Catálogos', 'Cartões', 'Folhetos'],
    image: '/images/supplied/grafica.png',
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
      'Aqui a marca sai do papel e passa a ocupar espaços, ruas, viaturas, eventos e pontos de venda. A imagem resume esse ecossistema visual: peças grandes, sinalização e aplicações que tornam a empresa mais visível onde o cliente realmente passa.',
    description:
      'Desenvolvemos peças de grande formato e aplicações de marca para espaços, viaturas, eventos e pontos de venda, com produção pensada para visibilidade, resistência e coerência visual.',
    productsIntro:
      'Produtos para promover a marca em espaços comerciais, viaturas, eventos e campanhas.',
    points: ['Rollups', 'Viaturas', 'Placas'],
    image: '/images/supplied/impressao-digital-branding.png',
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
      'Brindes funcionam melhor quando parecem úteis, bem acabados e feitos para a pessoa certa. A imagem apresenta uma família de objetos personalizados que podem apoiar lançamentos, ações comerciais, eventos e relacionamento com clientes.',
    description:
      'Personalizamos brindes e objetos promocionais com impressão UV direta, criando peças úteis, memoráveis e alinhadas com campanhas, eventos e relacionamento com clientes.',
    productsIntro:
      'Produtos promocionais e brindes para campanhas, eventos e oferta corporativa.',
    points: ['UV', 'Brindes', 'Premium'],
    image: '/images/supplied/impressao-uv-brindes.png',
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
      'Corte a laser é ideal quando o detalhe faz diferença: letras, padrões, brindes, placas, peças decorativas e protótipos com formas difíceis de produzir por métodos comuns. A imagem mostra essa combinação de precisão técnica, materiais variados e acabamento visual.',
    description:
      'Executamos corte e gravação a laser para peças decorativas, sinalização, brindes, protótipos e acabamentos especiais, com atenção à precisão, material e detalhe do desenho.',
    productsIntro:
      'Produtos e aplicações com corte ou gravação a laser para decoração, sinalização e brindes.',
    points: ['Acrílico', 'MDF', 'Precisão'],
    image: '/images/supplied/cortes-a-laser.png',
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
      'Painéis 3D criam presença permanente para a marca dentro de receções, lojas, escritórios e fachadas. A imagem destaca aplicações com volume, iluminação e materiais de acabamento que transformam uma parede simples num ponto de identidade.',
    description:
      'Criamos painéis, letras caixa e elementos tridimensionais para receções, lojas, escritórios e fachadas, combinando materiais, iluminação e instalação para reforçar a identidade do espaço.',
    productsIntro:
      'Produtos para sinalização, decoração e presença de marca em interiores e exteriores.',
    points: ['3D', 'Letras caixa', 'Interiores'],
    image: '/images/supplied/paineis-3d.png',
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
