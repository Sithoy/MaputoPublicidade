import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Maputo Publicidade | Publicidade, Gráfica e Impressão Digital',
    template: '%s | Maputo Publicidade',
  },
  description:
    'Soluções completas em serigrafia, gráfica, impressão digital, brindes corporativos e branding de viaturas em Maputo, Moçambique.',
  openGraph: {
    type: 'website',
    locale: 'pt_MZ',
    url: siteUrl,
    siteName: 'Maputo Publicidade',
    title: 'Maputo Publicidade | Publicidade, Gráfica e Impressão Digital',
    description:
      'Soluções completas em serigrafia, gráfica, impressão digital, brindes corporativos e branding de viaturas em Maputo, Moçambique.',
    images: [`${siteUrl}/og-image.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maputo Publicidade | Publicidade, Gráfica e Impressão Digital',
    description:
      'Soluções completas em serigrafia, gráfica, impressão digital, brindes corporativos e branding de viaturas em Maputo, Moçambique.',
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
    <html lang="pt-MZ" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
