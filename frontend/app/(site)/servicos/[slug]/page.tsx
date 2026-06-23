import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { get, normalizePaginatedResponse, type Category, type PaginatedResponse, type Product } from '@/lib/api';
import {
  getMainService,
  getServiceCommercialDetails,
  mainServices,
  type ServiceProductGroup,
} from '@/lib/service-catalog';
import { serviceIconMap } from '@/lib/service-icons';

export const revalidate = 60;

export function generateStaticParams() {
  return mainServices.map((service) => ({ slug: service.slug }));
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export function generateMetadata({ params }: { params: { slug: string } }) {
  const service = getMainService(params.slug);

  if (!service) {
    return { title: 'Serviço | Maputo Publicidade' };
  }

  return {
    title: `${service.title} | Maputo Publicidade`,
    description: service.summary,
    openGraph: {
      title: `${service.title} | Maputo Publicidade`,
      description: service.summary,
      images: [`${siteUrl}${service.image}`],
    },
  };
}

async function getWithTimeout<T>(path: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    return await get<T>(path, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function getServiceProducts(categorySlug: string) {
  try {
    const data = await getWithTimeout<Product[] | PaginatedResponse<Product>>(`/api/products/?category=${categorySlug}`);
    return normalizePaginatedResponse<Product>(data);
  } catch {
    return [];
  }
}

async function getServiceCategory(categorySlug: string) {
  try {
    return await getWithTimeout<Category>(`/api/categories/${categorySlug}/`);
  } catch {
    return null;
  }
}

type ProductGroupView = ServiceProductGroup & {
  products: Product[];
};

function getGroupedProducts(groups: ServiceProductGroup[], products: Product[]) {
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const usedSlugs = new Set<string>();

  const productGroups = groups.map<ProductGroupView>((group) => {
    const groupProducts = group.productSlugs
      .map((slug) => productsBySlug.get(slug))
      .filter((product): product is Product => Boolean(product));

    groupProducts.forEach((product) => usedSlugs.add(product.slug));

    return {
      ...group,
      products: groupProducts,
    };
  });

  const extraProducts = products.filter((product) => !usedSlugs.has(product.slug));

  if (extraProducts.length > 0) {
    productGroups.push({
      title: 'Outras opções do catálogo',
      description: 'Produtos adicionais ligados a este serviço.',
      productSlugs: extraProducts.map((product) => product.slug),
      fallbackItems: [],
      products: extraProducts,
    });
  }

  return productGroups;
}

function formatPrice(value?: number) {
  if (!value) return 'Sob orçamento';

  return `${Number(value).toLocaleString('pt-MZ')} MZN`;
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = getMainService(params.slug);

  if (!service) notFound();

  const commercial = getServiceCommercialDetails(service.slug);

  if (!commercial) notFound();

  const [category, products] = await Promise.all([
    getServiceCategory(service.categorySlug),
    getServiceProducts(service.categorySlug),
  ]);
  const ServiceIcon = serviceIconMap[service.iconName];
  const quoteHref = `/orcamento?produto=${commercial.recommendedPackage.productSlug}&servico=${service.slug}`;
  const productGroups = getGroupedProducts(commercial.productGroups, products);

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.summary,
    image: `${siteUrl}${service.image}`,
    provider: {
      '@type': 'LocalBusiness',
      name: 'Maputo Publicidade',
      telephone: '+25882555736',
      email: 'maputopublicidade@outlook.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Rua da Resistência Nº 1550 R/C',
        addressLocality: 'Maputo',
        addressCountry: 'MZ',
      },
    },
    areaServed: {
      '@type': 'City',
      name: 'Maputo',
    },
  };

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-14">
          <Link
            href="/servicos"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos serviços
          </Link>

          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-white shadow-lg shadow-brand/30">
                <ServiceIcon className="h-6 w-6" />
              </div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                {service.eyebrow}
              </p>
              <h1 className="text-4xl font-bold leading-tight text-dark md:text-5xl">{service.title}</h1>
            </div>

            <div className="flex flex-wrap gap-2">
              {service.points.map((point) => (
                <span
                  key={point}
                  className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-brand shadow-sm ring-1 ring-gray-100"
                >
                  {point}
                </span>
              ))}
            </div>
          </div>

          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-dark shadow-2xl shadow-gray-900/15 ring-1 ring-black/5">
            <Image
              src={service.image}
              alt={service.title}
              fill
              priority
              sizes="100vw"
              className="object-contain"
              quality={96}
            />
          </div>

          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100 lg:p-7">
            <p className="text-base leading-relaxed text-gray-700 md:text-lg">{service.showcaseText}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <Badge className="mb-4">{category?.name || service.title}</Badge>
            <h2 className="text-3xl font-bold text-dark md:text-4xl">Como este serviço ajuda a sua marca</h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">{commercial.promise}</p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">{service.description}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {service.benefits.map((benefit) => (
                <div key={benefit.title} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-dark">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{benefit.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand">
                  <Sparkles className="h-4 w-4" />
                  Ideal para
                </div>
                <ul className="space-y-3 text-sm leading-relaxed text-gray-700">
                  {commercial.idealFor.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand">
                  <PackageCheck className="h-4 w-4" />
                  Entregamos
                </div>
                <ul className="space-y-3 text-sm leading-relaxed text-gray-700">
                  {commercial.deliverables.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-dark p-6 text-white shadow-xl shadow-black/10">
            <h2 className="text-xl font-semibold">Do briefing à entrega</h2>
            <div className="mt-6 space-y-4">
              {service.process.map((step, index) => (
                <div key={step} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="border-b border-white/10 pb-4 text-sm font-medium text-white/85 last:border-b-0 last:pb-0">
                    {step}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg bg-white/5 p-4 ring-1 ring-white/10">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <ClipboardCheck className="h-4 w-4 text-brand" />
                Para orçar melhor
              </div>
              <ul className="space-y-2 text-sm leading-relaxed text-white/75">
                {commercial.quoteChecklist.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 border-t border-white/10 pt-5">
              <Link
                href={quoteHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-6 py-3 text-lg font-medium text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand/50"
              >
                <FileText className="h-5 w-5" />
                Pedir orçamento
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="grid gap-8 rounded-lg border border-brand/15 bg-brand/5 p-6 lg:grid-cols-[0.85fr_1.15fr] lg:p-8">
            <div>
              <Badge variant="outline" className="mb-4 bg-white">
                {commercial.recommendedPackage.label}
              </Badge>
              <h2 className="text-3xl font-bold text-dark md:text-4xl">
                {commercial.recommendedPackage.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-700">
                {commercial.recommendedPackage.description}
              </p>
              <Link
                href={quoteHref}
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Pedir este ponto de partida
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {commercial.recommendedPackage.items.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <span className="text-sm font-medium leading-relaxed text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Produtos relacionados
              </p>
              <h2 className="mt-2 text-3xl font-bold text-dark md:text-4xl">Escolha por categoria de produto</h2>
              <p className="mt-3 max-w-2xl text-gray-600">{service.productsIntro}</p>
            </div>

            <Link
              href={`/catalogo?categoria=${encodeURIComponent(service.title)}`}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-brand px-4 py-2 text-base font-medium text-brand transition hover:bg-brand hover:text-white focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              Ver no catálogo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {productGroups.map((group) => (
              <Card key={group.title} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-dark">{group.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{group.description}</p>

                  {group.products.length > 0 ? (
                    <div className="mt-5 space-y-4">
                      {group.products.map((product) => (
                        <div
                          key={product.id}
                          className="grid gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center"
                        >
                          <div className="relative aspect-[4/3] w-24 overflow-hidden rounded-md bg-white">
                            <Image
                              src={product.image || service.image}
                              alt={product.name}
                              fill
                              sizes="96px"
                              className={product.image ? 'object-contain p-2' : 'object-cover'}
                            />
                          </div>
                          <div>
                            <Badge className="mb-2">{product.category || service.title}</Badge>
                            <h4 className="font-semibold text-dark">{product.name}</h4>
                            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600">
                              {product.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                              {product.min_quantity ? (
                                <span className="rounded-full bg-white px-2.5 py-1">
                                  Mín. {product.min_quantity}
                                </span>
                              ) : null}
                              {product.lead_time ? (
                                <span className="rounded-full bg-white px-2.5 py-1">{product.lead_time}</span>
                              ) : null}
                              <span className="rounded-full bg-white px-2.5 py-1">
                                {formatPrice(product.base_price)}
                              </span>
                            </div>
                          </div>
                          <Link
                            href={`/catalogo/${product.slug}`}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-brand px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
                          >
                            Detalhes
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {group.fallbackItems.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {products.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-brand" />
              <h3 className="mt-3 text-lg font-semibold text-dark">Catálogo dinâmico em sincronização</h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
                As categorias acima já ajudam a estruturar o briefing. Assim que o backend estiver disponível,
                esta área mostra os produtos reais associados a este serviço.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
