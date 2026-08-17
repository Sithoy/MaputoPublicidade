import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Award,
  Clock,
  HeartHandshake,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Target,
  Users,
} from 'lucide-react';

export const metadata = {
  title: 'Sobre Nós | Maputo Publicidade',
  description:
    'Conheça a história da Maputo Publicidade, a nossa forma de trabalhar e os contactos da nossa equipa em Maputo.',
};

const values = [
  {
    icon: Award,
    title: 'Qualidade cuidada',
    description: 'Produção consistente e atenção aos detalhes que representam a sua marca.',
  },
  {
    icon: Users,
    title: 'Equipa experiente',
    description: 'Mais de uma década de experiência aplicada a desafios reais de comunicação.',
  },
  {
    icon: Target,
    title: 'Compromisso com o resultado',
    description: 'Cada decisão é orientada pelo prazo, pelo contexto e pelo objetivo do cliente.',
  },
  {
    icon: HeartHandshake,
    title: 'Relações próximas',
    description: 'Comunicação clara e acompanhamento do primeiro contacto à entrega final.',
  },
];

const whatsappHref =
  'https://wa.me/25882555736?text=Olá! Gostaria de falar com a Maputo Publicidade sobre um projeto.';

export default function AboutPage() {
  return (
    <main className="bg-[#FAFBF8]">
      <section className="border-b border-[#E3E8E4] bg-[#F2F6F1]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.7fr] lg:items-end lg:py-28">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Sobre nós</p>
            <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-[-0.045em] text-dark sm:text-5xl lg:text-6xl">
              Uma relação próxima, da primeira conversa à entrega.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5E6D65]">
              Há mais de 10 anos ajudamos empresas e instituições em Moçambique a transformar
              necessidades de comunicação em soluções bem executadas, consistentes e prontas para
              ganhar vida.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#contactos"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-[0_14px_28px_-18px_rgba(8,114,71,0.9)] transition hover:-translate-y-0.5 hover:bg-brand-600"
              >
                Fale connosco
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex h-12 items-center rounded-xl border border-[#D6E0D8] bg-white px-5 text-sm font-bold text-[#304038] transition hover:border-brand/30 hover:text-brand-800"
              >
                Conheça o nosso trabalho
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:pb-1">
            <div className="rounded-2xl border border-[#DCE5DE] bg-white p-5">
              <p className="text-3xl font-extrabold tracking-[-0.04em] text-brand-800">10+</p>
              <p className="mt-2 text-sm leading-6 text-[#66736D]">anos a acompanhar marcas moçambicanas</p>
            </div>
            <div className="rounded-2xl border border-[#DCE5DE] bg-white p-5">
              <p className="text-3xl font-extrabold tracking-[-0.04em] text-brand-800">360º</p>
              <p className="mt-2 text-sm leading-6 text-[#66736D]">da ideia à produção, instalação e entrega</p>
            </div>
          </div>
        </div>
      </section>

      <section id="historia" className="scroll-mt-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="relative min-h-[390px] overflow-hidden rounded-[28px] bg-brand-100 sm:min-h-[520px]">
            <Image
              src="/images/corporate-team.jpg"
              alt="Equipa da Maputo Publicidade"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#042C20]/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 max-w-md p-6 text-white sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-100">A nossa história</p>
              <p className="mt-3 text-2xl font-bold leading-tight">
                Crescemos com a confiança de quem nos escolhe para representar a sua marca.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Quem somos</p>
            <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.035em] text-dark sm:text-4xl lg:text-5xl">
              Experiência de produção com uma forma humana de trabalhar.
            </h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-[#5E6D65]">
              <p>
                A <strong className="font-semibold text-dark">Maputo Publicidade e Serviços Lda</strong>{' '}
                nasceu para apoiar empresas e instituições com comunicação visual produzida de forma
                organizada, próxima e responsável.
              </p>
              <p>
                Ao longo de mais de uma década, reunimos competências em impressão, gráfica,
                serigrafia, bordado, brindes corporativos, sinalética e branding. Mais importante do que
                a lista de serviços é a capacidade de coordenar tudo com clareza e consistência.
              </p>
              <p>
                O nosso papel é simplificar o processo para o cliente: compreender a necessidade,
                aconselhar a solução adequada, cuidar da produção e acompanhar a entrega.
              </p>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <article key={value.title} className="rounded-2xl border border-[#E0E7E2] bg-white p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-bold text-dark">{value.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#66736D]">{value.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="contactos" className="scroll-mt-24 bg-brand-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-100">Contactos</p>
            <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              Vamos conversar sobre o próximo passo da sua marca.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/68 sm:text-lg">
              Conte-nos o que precisa. A nossa equipa ajuda a organizar a solução, o prazo e a melhor
              forma de avançar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-brand-900 transition hover:-translate-y-0.5 hover:bg-brand-50"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <Link
                href="/orcamento"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Pedir orçamento
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.06]">
            <div className="grid gap-px bg-white/10 sm:grid-cols-2">
              <a href="tel:+25882555736" className="flex gap-4 bg-brand-900/95 p-6 transition hover:bg-white/5">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-100" />
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-white/50">Telefone</span>
                  <span className="mt-2 block text-sm leading-6 text-white">82 555 736 / 84 741 2838</span>
                </span>
              </a>
              <a href="mailto:info@maputopublicidade.com" className="flex gap-4 bg-brand-900/95 p-6 transition hover:bg-white/5">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-100" />
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-white/50">E-mail</span>
                  <span className="mt-2 block text-sm leading-6 text-white">info@maputopublicidade.com</span>
                </span>
              </a>
              <div className="flex gap-4 bg-brand-900/95 p-6">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-100" />
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-white/50">Morada</span>
                  <span className="mt-2 block text-sm leading-6 text-white">Rua da Resistência Nº 1550 R/C, Maputo</span>
                </span>
              </div>
              <div className="flex gap-4 bg-brand-900/95 p-6">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-100" />
                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-white/50">Horário</span>
                  <span className="mt-2 block text-sm leading-6 text-white">Segunda a Sexta, 08h00–17h00</span>
                </span>
              </div>
            </div>
            <div className="aspect-[16/8] min-h-[260px] bg-white/5">
              <iframe
                title="Localização da Maputo Publicidade"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3584.0!2d32.5833!3d-25.9667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDU4JzAwLjEiUyAzMsKwMzUnMDAuMCJF!5e0!3m2!1spt-PT!2smz!4v1600000000000!5m2!1spt-PT!2smz"
                className="h-full w-full border-0 grayscale-[0.2]"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
