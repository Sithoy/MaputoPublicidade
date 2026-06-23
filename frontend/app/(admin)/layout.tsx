import { AdminShell } from '@/components/admin/AdminShell';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | Maputo Publicidade',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
