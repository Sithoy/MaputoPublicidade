import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { get, type Category, type Product } from '@/lib/api';
import { getMainService, mainServices } from '@/lib/service-catalog';
import { serviceIconMap } from '@/lib/service-icons';

export const revalidate = 60;

export function generateStaticParams() {
  return mainServices.map((service) => ({ slug: service.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const service = getMainService(params.slug);

  if (!service) {
    return { title: 'Serviço | Maputo Publicidade' };
  }

  return {
    title: `${service.title} | Maputo Publicidade`,
    description: service.summary,
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
    return await getWithTimeout<Product[]>(`/api/products/?category=${categorySlug}`);
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

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = getMainService(params.slug);

  if (!service) notFound();

  const [category, products] = await Promise.all([
    getServiceCategory(service.categorySlug),
    getServiceProducts(service.categorySlug),
  ]);
  const ServiceIcon = serviceIconMap[service.iconName];

  return (
    <div className="bg-white">
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
            <h2 className="text-3xl font-bold text-dark md:text-4xl">O que fazemos nesta área</h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">{service.description}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {service.benefits.map((benefit) => (
                <div key={benefit.title} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-dark">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{benefit.text}</p>
                </div>
              ))}
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
            <div className="mt-6 border-t border-white/10 pt-5">
              <Link href={`/orcamento?servico=${service.slug}`}>
                <Button size="lg" className="w-full gap-2">
                  <FileText className="h-5 w-5" />
                  Pedir orçamento
                </Button>
              </Link>
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
              <h2 className="mt-2 text-3xl font-bold text-dark md:text-4xl">Escolha por produto</h2>
              <p className="mt-3 max-w-2xl text-gray-600">{service.productsIntro}</p>
            </div>

            <Link href={`/catalogo?categoria=${encodeURIComponent(service.title)}`}>
              <Button variant="outline" className="gap-2">
                Ver no catálogo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-brand" />
              <h3 className="mt-4 text-lg font-semibold text-dark">Produtos em preparação</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
                Esta área já está pronta para receber produtos associados no catálogo. Enquanto isso,
                envie o seu briefing e preparamos uma proposta personalizada.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <Card key={product.id} className="transition-shadow hover:shadow-md">
                  <div className="relative aspect-square bg-white">
                    <Image
                      src={product.image || service.image}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className={product.image ? 'object-contain p-6' : 'object-cover'}
                    />
                  </div>
                  <CardContent>
                    <Badge className="mb-2">{product.category || service.title}</Badge>
                    <h3 className="mb-2 text-lg font-semibold text-dark">{product.name}</h3>
                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-600">
                      {product.description}
                    </p>
                    <Link href={`/catalogo/${product.slug}`}>
                      <Button variant="outline" className="w-full gap-2">
                        Ver detalhes
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
