import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileUp,
  History,
  LayoutDashboard,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';

const platformFeatures = [
  { icon: FileUp, label: 'Envio de logótipo e arte' },
  { icon: FileCheck2, label: 'Aprovação de provas digitais' },
  { icon: Clock3, label: 'Estado do pedido em tempo real' },
  { icon: History, label: 'Histórico de encomendas' },
  { icon: RefreshCw, label: 'Reposição de materiais recorrentes' },
  { icon: PackageCheck, label: 'Pedidos e orçamentos organizados' },
];

const orders = [
  { name: 'Uniformes da equipa comercial', meta: 'Em produção', tone: 'bg-[#EAF5EF] text-brand-800' },
  { name: 'Sinalização da nova loja', meta: 'Prova para aprovação', tone: 'bg-[#F4F0E8] text-[#8A671E]' },
  { name: 'Reposição de cartões', meta: 'Entregue', tone: 'bg-[#F1F3F1] text-[#5D6A63]' },
];

export function BrandPlatformSection() {
  return (
    <section id="plataforma" className="scroll-mt-24 bg-[#F4F0E8] py-16 sm:py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Mais perto do cliente</p>
          <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.035em] text-dark sm:text-4xl lg:text-5xl">
            Gestão da sua marca, agora mais perto de si.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#66736D] sm:text-lg">
            A plataforma digital da Maputo Publicidade organiza pedidos, ficheiros e aprovações num
            só lugar. Menos mensagens perdidas, menos versões espalhadas e mais controlo sobre cada
            material da sua empresa.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {platformFeatures.map((feature) => (
              <div key={feature.label} className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/65 px-4 py-3 text-sm font-medium text-[#35473E]">
                <feature.icon className="h-4 w-4 shrink-0 text-brand" />
                {feature.label}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link href="/branddesk/demo" className="group inline-flex items-center gap-2 rounded-xl bg-brand-800 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_-18px_rgba(6,63,43,0.85)] transition hover:-translate-y-0.5 hover:bg-brand-700">
              Experimentar BrandDesk
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/area-cliente" className="group inline-flex items-center gap-2 text-sm font-bold text-brand-800 hover:text-brand">
              Já sou cliente
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 rounded-[2.25rem] bg-brand-100/55 blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_30px_80px_-42px_rgba(23,33,29,0.42)]">
            <div className="flex items-center justify-between border-b border-[#E3E8E4] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <LayoutDashboard className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-dark">Área da sua marca</p>
                  <p className="text-xs text-[#7A8780]">Pedidos e aprovações</p>
                </div>
              </div>
              <span className="hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 sm:inline-flex">Empresa Exemplo</span>
            </div>

            <div className="grid sm:grid-cols-[150px_1fr]">
              <aside className="hidden border-r border-[#E3E8E4] bg-[#FAFBF8] p-4 sm:block">
                {['Visão geral', 'Pedidos', 'Orçamentos', 'Ficheiros', 'Histórico'].map((item, index) => (
                  <div key={item} className={`mb-1 rounded-lg px-3 py-2.5 text-xs font-semibold ${index === 1 ? 'bg-brand-50 text-brand-800' : 'text-[#748078]'}`}>
                    {item}
                  </div>
                ))}
              </aside>

              <div className="p-5 sm:p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[#7A8780]">Bom dia</p>
                    <h3 className="mt-1 text-xl font-bold text-dark">Os seus pedidos</h3>
                  </div>
                  <span className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white">Novo pedido</span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[
                    ['3', 'Em curso'],
                    ['1', 'Aprovação'],
                    ['12', 'Concluídos'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl border border-[#E3E8E4] bg-[#FAFBF8] p-3">
                      <p className="text-lg font-extrabold text-dark">{value}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-[#7A8780] sm:text-xs">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-2.5">
                  {orders.map((order) => (
                    <div key={order.name} className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E8E4] p-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                        <p className="truncate text-xs font-semibold text-dark sm:text-sm">{order.name}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${order.tone}`}>{order.meta}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
