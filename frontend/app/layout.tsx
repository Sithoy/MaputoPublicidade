import type { Metadata } from 'next';
import '@/styles/globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Maputo Publicidade | Gestão e Produção de Marca',
    template: '%s | Maputo Publicidade',
  },
  description:
    'Parceiro de execução e gestão de marca para empresas em Maputo, da criação à produção, instalação e entrega.',
  openGraph: {
    type: 'website',
    locale: 'pt_MZ',
    url: siteUrl,
    siteName: 'Maputo Publicidade',
    title: 'Maputo Publicidade | Gestão e Produção de Marca',
    description:
      'Há mais de 10 anos a ajudar empresas a gerir uma presença visual consistente em Maputo.',
    images: [`${siteUrl}/og-image.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maputo Publicidade | Gestão e Produção de Marca',
    description:
      'Parceiro de execução e gestão de marca, da primeira conversa à entrega final.',
    images: [`${siteUrl}/og-image.png`],
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ">
      <body>{children}</body>
    </html>
  );
}
