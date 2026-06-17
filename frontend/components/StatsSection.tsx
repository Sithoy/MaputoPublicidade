import { Award, Clock, Lightbulb, Users } from 'lucide-react';

const stats = [
  { icon: Award, value: '+10', label: 'Anos de Experiência' },
  { icon: Clock, value: '100%', label: 'Compromisso com a Qualidade' },
  { icon: Users, value: 'Milhares', label: 'de Clientes Satisfeitos' },
  { icon: Lightbulb, value: 'Soluções', label: 'Personalizadas para a sua empresa' },
];

export function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-dark py-12 text-white">
      <div className="absolute inset-y-0 right-0 hidden w-2/3 opacity-45 lg:block">
        <div className="h-full w-full bg-[url('/images/supplied/overview-brand.png')] bg-cover bg-center" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-dark/95 to-brand-900/45" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-6">
        <div className="grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/20">
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="text-3xl font-extrabold text-accent">{stat.value}</div>
              <div className="mt-1 text-sm font-medium text-gray-100">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
