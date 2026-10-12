'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/auth';
import { forgetReceptionEdit, registerReceptionEdit } from '@/lib/reception-edit-session';

export type EditSession = { editor_id: number; editor_name: string; expires_at: string };
export function useReceptionEdit(reference: string, order: string | null | undefined) {
  const [session, setSession] = useState<EditSession | null>(null);
  const [editable, setEditable] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const token = useRef(''); const expires = useRef(0); const activity = useRef(Date.now());
  const current = useRef(reference); current.current = reference;
  const path = `/api/reception/${encodeURIComponent(reference)}/edit-session/`;
  function lose(message: string) { forgetReceptionEdit(token.current); token.current = ''; setEditable(false); setError(message); }
  async function acquire(reason = '') {
    if (!reference || pending) return false;
    setPending(true); setError('');
    try {
      const response: { session: EditSession; token: string } = await fetchWithAuth(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: reason ? 'takeover' : 'acquire', ...(reason ? { reason } : {}) }) });
      if (current.current !== reference) { await fetchWithAuth(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Reception-Edit-Token': response.token }, body: JSON.stringify({ action: 'release' }) }); return false; }
      token.current = response.token; expires.current = new Date(response.session.expires_at).getTime(); registerReceptionEdit(reference, response.token, order); activity.current = Date.now();
      setSession(response.session); setEditable(true); return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível reservar a edição.'); return false; }
    finally { setPending(false); }
  }
  async function release() {
    if (!token.current) return;
    setPending(true);
    try { await fetchWithAuth(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'release' }) }); }
    catch { /* Expired/superseded sessions must never release a newer reservation. */ }
    finally { lose(''); setSession(null); setPending(false); }
  }
  useEffect(() => { if (token.current && order) registerReceptionEdit(reference, token.current, order); }, [reference, order]);
  useEffect(() => {
    setSession(null); setEditable(false); setError(''); if (!reference) return;
    let alive = true; let checking = false;
    const interact = () => { activity.current = Date.now(); };
    const check = async () => {
      if (checking) return; checking = true;
      try {
        if (token.current && Date.now() >= expires.current) lose('A reserva expirou. O rascunho fica protegido; atualize antes de voltar a editar.');
        if (document.visibilityState !== 'visible') return;
        const renew = Boolean(token.current) && Date.now() - activity.current < 240000;
        const response = await fetchWithAuth(path, renew ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'heartbeat' }) } : {});
        if (!alive) return;
        setSession(response.session); if (renew && response.session) expires.current = new Date(response.session.expires_at).getTime();
      } catch { if (alive && token.current) lose('Não foi possível confirmar a reserva. A edição foi pausada para proteger os dados.'); }
      finally { checking = false; }
    };
    void check(); const timer = window.setInterval(check, 20000);
    window.addEventListener('pointerdown', interact, { passive: true }); window.addEventListener('keydown', interact);
    return () => {
      alive = false; window.clearInterval(timer); window.removeEventListener('pointerdown', interact); window.removeEventListener('keydown', interact);
      const previous = token.current; token.current = ''; forgetReceptionEdit(previous);
      if (previous) void fetchWithAuth(path, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', 'X-Reception-Edit-Token': previous }, body: JSON.stringify({ action: 'release' }) }).catch(() => {});
    };
  }, [reference, path]);
  return { session, editable, error, pending, acquire, release };
}
