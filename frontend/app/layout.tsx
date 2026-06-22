import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Maputo Publicidade | Publicidade, Gráfica e Impressão Digital',
  description:
    'Soluções completas em serigrafia, gráfica, impressão digital, brindes corporativos e branding de viaturas em Maputo, Moçambique.',
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
