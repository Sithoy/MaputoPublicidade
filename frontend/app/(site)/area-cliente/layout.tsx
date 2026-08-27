import type { Metadata } from 'next';
import ClientAreaLayout from './ClientAreaLayout';

export const metadata: Metadata = {
  title: 'BrandDesk',
  description: 'Organize pedidos, aprovações, materiais de marca e entregas num só lugar.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientAreaLayout>{children}</ClientAreaLayout>;
}
