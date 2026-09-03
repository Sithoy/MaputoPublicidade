'use client';

import { usePathname } from 'next/navigation';
import { CookieBanner } from '@/components/CookieBanner';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { WhatsAppButton } from '@/components/WhatsAppButton';

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortalExperience =
    pathname.startsWith('/area-cliente') || pathname.startsWith('/branddesk/demo');

  if (isPortalExperience) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <CookieBanner />
    </div>
  );
}
