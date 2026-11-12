import type { Metadata } from 'next';
import { BrandDeskDemo } from './_components/BrandDeskDemo';

export const metadata: Metadata = {
  title: 'Demonstração BrandDesk by ETIOS',
  description:
    'Explore uma demonstração do BrandDesk e veja como acompanhar pedidos, propostas, aprovações e materiais de marca.',
  alternates: { canonical: '/branddesk/demo' },
  openGraph: { url: '/branddesk/demo' },
  robots: { index: true, follow: true },
};

export default function BrandDeskDemoPage() {
  return <BrandDeskDemo />;
}
