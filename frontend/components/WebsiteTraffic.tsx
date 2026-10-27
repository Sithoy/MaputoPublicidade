'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsAllowed, publicTrafficPath, trackWebsiteAction, TRAFFIC_CHANGE } from '@/lib/website-traffic';

export function WebsiteTraffic() {
  const pathname = usePathname();
  const last = useRef('');
  useEffect(() => {
    function visit() {
      if (!analyticsAllowed()) { last.current = ''; return; }
      if (!publicTrafficPath(pathname) || last.current === pathname) return;
      last.current = pathname;
      trackWebsiteAction('page_view', pathname);
    }
    function click(event: MouseEvent) {
      if (!publicTrafficPath(pathname) || !(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href]');
      if (!anchor) return;
      try {
        const target = new URL(anchor.getAttribute('href') || '', location.origin);
        if (['wa.me', 'api.whatsapp.com', 'web.whatsapp.com'].includes(target.hostname)) trackWebsiteAction('whatsapp_click', pathname);
        else if (target.origin === location.origin && target.pathname === '/orcamento') trackWebsiteAction('quote_click', pathname);
        else if (target.origin === location.origin && target.pathname === '/area-cliente/registo') trackWebsiteAction('signup_click', pathname);
      } catch { /* Ignore non-web links. */ }
    }
    visit();
    window.addEventListener(TRAFFIC_CHANGE, visit);
    window.addEventListener('storage', visit);
    document.addEventListener('click', click, true);
    return () => { window.removeEventListener(TRAFFIC_CHANGE, visit); window.removeEventListener('storage', visit); document.removeEventListener('click', click, true); };
  }, [pathname]);
  return null;
}
