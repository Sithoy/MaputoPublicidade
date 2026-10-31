'use client';

import { useState } from 'react';
import Link from 'next/link';

export function RequestReviewLink({ request }: { request: () => Promise<{ detail: string }> }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  async function send() {
    if (busy || done) return;
    setBusy(true); setError('');
    try { setDone((await request()).detail); }
    catch { setError('Não foi possível enviar o pedido. Aguarde e tente novamente ou contacte a MP.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Renovar acesso" className="space-y-4 rounded-2xl border border-[#dcc68d] bg-[#faf7ed] p-6 text-[#173f30]">
    <div><h2 className="text-lg font-semibold">Vamos recuperar o próximo passo.</h2><p className="mt-2 text-sm leading-6">O prazo deste acesso terminou. Peça à Recepção que confirme a versão atual e envie um novo link ao contacto registado. Nenhuma aprovação ou condição será alterada automaticamente.</p></div>
    {done ? <p role="status" className="text-sm">{done}</p> : <button type="button" disabled={busy} onClick={send} className="rounded-xl bg-[#173f30] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'A enviar pedido…' : 'Pedir novo link'}</button>}
    {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
    <p className="text-xs leading-5">Já tem conta? <Link href="/area-cliente" className="font-semibold underline">Entrar no BrandDesk</Link> para acompanhar os seus pedidos.</p>
  </section>;
}
