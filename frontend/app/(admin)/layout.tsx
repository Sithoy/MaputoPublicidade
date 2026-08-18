import { AdminShell } from '@/components/admin/AdminShell';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Administração | Maputo Publicidade' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
