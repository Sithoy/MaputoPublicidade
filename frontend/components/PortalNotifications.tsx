'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { fetchWithAuth } from '@/lib/auth';

type Notice = {
  id: number;
  title: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

export function PortalNotifications({ userId }: { userId: number }) {
  const pathname = usePathname();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [list, unread] = await Promise.all([
        fetchWithAuth('/api/notifications/', { signal }),
        fetchWithAuth('/api/notifications/unread_count/', { signal }),
      ]);
      if (signal?.aborted) return;
      setNotices(list.results ?? []);
      setCount(unread.count ?? 0);
      setError('');
    } catch {
      if (!signal?.aborted) setError('Não foi possível carregar os avisos.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setNotices([]);
    setCount(0);
    void load(controller.signal);
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(controller.signal);
    };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [load, pathname, userId]);

  async function readNotice(id: number) {
    try {
      await fetchWithAuth(`/api/notifications/${id}/read/`, { method: 'POST' });
      await load();
    } catch {
      setError('Não foi possível marcar o aviso como lido.');
    }
  }

  async function readAll() {
    setBusy(true);
    try {
      await fetchWithAuth('/api/notifications/read_all/', { method: 'POST' });
      await load();
    } catch {
      setError('Não foi possível marcar os avisos como lidos.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="relative" key={pathname}>
      <summary className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-[#dfe7e1] text-brand-800 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden" aria-label={`Notificações: ${count} não lidas`}>
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-brand-700 px-1.5 text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</span> : null}
      </summary>
      <div className="absolute right-0 top-12 z-50 w-[min(88vw,380px)] overflow-hidden rounded-2xl border border-[#dfe7e1] bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <h2 className="font-semibold text-dark">Notificações</h2>
          <button type="button" disabled={busy || count === 0} onClick={() => void readAll()} className="flex items-center gap-1 text-xs font-semibold text-brand-700 disabled:opacity-40">
            <CheckCheck className="h-4 w-4" aria-hidden="true" /> Marcar todas
          </button>
        </div>
        {error ? <div className="p-4 text-sm text-red-700" role="alert">{error}<button type="button" onClick={() => void load()} className="mt-2 flex items-center gap-1 font-semibold"><RefreshCw className="h-4 w-4" /> Tentar novamente</button></div> : null}
        <div className="max-h-96 overflow-y-auto">
          {notices.map((notice) => (
            <Link key={notice.id} href={notice.href} onClick={() => { if (!notice.read_at) void readNotice(notice.id); }} className={`block border-b px-4 py-3 text-sm hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${notice.read_at ? 'text-[#68776f]' : 'bg-brand-50/50 font-semibold text-dark'}`}>
              {notice.title}
              <time dateTime={notice.created_at} className="mt-1 block text-xs font-normal text-[#829087]">{new Date(notice.created_at).toLocaleString('pt-MZ')}</time>
            </Link>
          ))}
          {!error && notices.length === 0 ? <p className="p-6 text-center text-sm text-[#829087]">Ainda não tem notificações.</p> : null}
        </div>
      </div>
    </details>
  );
}
