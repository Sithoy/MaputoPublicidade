import Image from 'next/image';
import { Award, Users, Target, HeartHandshake } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export const metadata = {
  title: 'Sobre Nós | Maputo Publicidade',
  description: 'Conheça a história e valores da Maputo Publicidade e Serviços Lda.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-24">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-dark md:text-4xl">Sobre Nós</h1>
        <p className="mx-auto mt-3 max-w-2xl text-gray-600">
          Há mais de 10 anos a ajudar empresas moçambicanas a comunicarem melhor.
        </p>
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <Image
            src="/images/corporate-team.jpg"
            alt="Equipa Maputo Publicidade"
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-5 text-gray-700">
          <p>
            A <strong className="text-dark">Maputo Publicidade e Serviços Lda</strong> nasceu com o propósito de
            oferecer soluções completas em comunicação visual para empresas e instituições em Moçambique.
          </p>
          <p>
            Ao longo de mais de uma década, consolidámos uma equipa especializada em serigrafia, bordado,
            impressão digital, gráfica, brindes corporativos e branding de viaturas. Trabalhamos com marcas
            de todos os tamanhos, desde pequenos negócios até grandes empresas.
          </p>
          <p>
            O nosso foco é claro: entregar produtos com qualidade, no prazo e ao melhor preço, contribuindo
            para que cada cliente destaque a sua marca no mercado.
          </p>

          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-3">
                <Award className="h-6 w-6 text-brand" />
                <span className="font-medium text-dark">Qualidade certificada</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <Users className="h-6 w-6 text-brand" />
                <span className="font-medium text-dark">Equipa experiente</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <Target className="h-6 w-6 text-brand" />
                <span className="font-medium text-dark">Foco no cliente</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <HeartHandshake className="h-6 w-6 text-brand" />
                <span className="font-medium text-dark">Acompanhamento próximo</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
