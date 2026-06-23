import type { Metadata } from 'next';
import ClientAreaLayout from './ClientAreaLayout';

export const metadata: Metadata = {
  title: 'Área do Cliente',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientAreaLayout>{children}</ClientAreaLayout>;
}
