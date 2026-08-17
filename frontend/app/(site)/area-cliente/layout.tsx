import type { Metadata } from 'next';
import ClientAreaLayout from './ClientAreaLayout';

export const metadata: Metadata = {
  title: 'Portal do Cliente',
  description: 'Acompanhe encomendas, aprovações e pagamentos da sua empresa.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientAreaLayout>{children}</ClientAreaLayout>;
}
