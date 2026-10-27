'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsAllowed, publicTrafficPath, trackWebsiteAction, TRAFFIC_CHANGE } from '@/lib/website-traffic';

export function WebsiteTraffic() {
  const pathname = usePathname();
  const last = useRef({ path: '', aggregate: false, optional: false });
  useEffect(() => {
    function visit() {
      if (!publicTrafficPath(pathname)) return;
      if (last.current.path !== pathname) last.current = { path: pathname, aggregate: false, optional: false };
      const detailOnly = last.current.aggregate;
      if (detailOnly && (!analyticsAllowed() || last.current.optional)) return;
      const result = trackWebsiteAction('page_view', pathname, detailOnly);
      if (result !== 'none') last.current.aggregate = true;
      if (result === 'optional') last.current.optional = true;
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
