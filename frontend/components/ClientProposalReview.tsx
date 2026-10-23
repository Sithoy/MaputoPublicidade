'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Download, LockKeyhole } from 'lucide-react';
import { formatMZN as formatMoney } from '@/lib/utils';
import { type ClientProposal, decisionLabels, proposalRequest } from '@/lib/proposal-review';
import { fetchBlobWithAuth, fetchWithAuth } from '@/lib/auth';

const formatMZN = (value: string | number) => formatMoney(Number(value));

export function ClientProposalReview({ reference }: { reference?: string } = {}) {
  const [token, setToken] = useState('');
  const [proposal, setProposal] = useState<ClientProposal | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<'accept' | 'changes' | 'decline'>('accept');
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [question, setQuestion] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const value = reference ? '' : new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    setToken(value);
    if (!value && !reference) { setError('Abra o link privado que recebeu da MP. Se precisar de um novo link, contacte a Recepção.'); return; }
    const controller = new AbortController();
    setBusy(true);
    setProposal(null); setError(''); setConfirmed(false); setName(''); setComment('');
    const load = reference
      ? fetchWithAuth(`/api/quotes/${encodeURIComponent(reference)}/client-review/`, { signal: controller.signal })
      : proposalRequest(value, { action: 'view' }, controller.signal).then((r) => r.json());
    load.then((data: ClientProposal) => {
      if (!controller.signal.aborted) setProposal(data);
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [reference]);
  async function respond(event: React.FormEvent) {
    event.preventDefault();
    if (!proposal || busy || !confirmed) return;
    setBusy(true); setError('');
    try {
      const values = { action, version: proposal.version, contact_name: name, comment, confirmed, ...(reference ? { snapshot: proposal.snapshot } : {}) };
      if (reference) setProposal(await fetchWithAuth(`/api/quotes/${encodeURIComponent(reference)}/client-review/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      }));
      else setProposal(await (await proposalRequest(token, values)).json());
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível registar a decisão.'); }
    finally { setBusy(false); }
  }
  async function pdf() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const blob = reference ? await fetchBlobWithAuth(`/api/quotes/${encodeURIComponent(reference)}/pdf/`)
        : await (await proposalRequest(token, { action: 'pdf' })).blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `Proposta-${proposal?.reference}.pdf`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'PDF indisponível.'); }
    finally { setBusy(false); }
  }
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !question.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await proposalRequest(token, { action: 'question', body: question });
      setNotice((await response.json()).detail); setQuestion('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Mensagem indisponível.'); }
    finally { setBusy(false); }
  }
  const Root = reference ? 'section' : 'main';
  return <Root className={reference ? 'text-[#173f30]' : 'min-h-screen bg-[#f3f4ed] text-[#173f30]'}>
    {!reference ? <header className="border-b border-[#dce2d5] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5"><Link href="/" className="font-serif text-2xl font-bold">Maputo Publicidade<span className="mt-1 block font-sans text-[10px] font-medium uppercase tracking-[.22em] text-[#7c896f]">Propostas · Relações de confiança</span></Link><span className="flex items-center gap-2 text-xs text-slate-500"><LockKeyhole className="h-4 w-4" />Acesso privado</span></div></header> : null}
    <div className={reference ? 'space-y-6' : 'mx-auto max-w-6xl space-y-6 px-5 py-8 md:py-12'}>
      <div><p className="text-xs uppercase tracking-[.2em] text-[#96773a]">Uma proposta para a sua marca</p><h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">O próximo passo começa consigo.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Reveja o que preparámos, esclareça as condições e partilhe a sua decisão. Não precisa de criar uma conta para responder.</p></div>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-800">{error}</p> : null}
      {busy && !proposal ? <p role="status">A abrir a sua proposta…</p> : null}
      {proposal ? <>
        <section className="overflow-hidden rounded-2xl border border-[#dce2d5] bg-white shadow-sm">
          <header className="flex flex-wrap items-end justify-between gap-5 bg-[#173f30] p-6 text-white md:p-8"><div><p className="text-xs tracking-wider text-[#dac68b]">{proposal.reference} · VERSÃO {proposal.version}</p><h2 className="mt-3 text-2xl font-semibold">{proposal.client_name}</h2><p className="mt-2 text-sm text-white/70">{proposal.valid_until ? `Válida até ${new Date(`${proposal.valid_until}T00:00:00`).toLocaleDateString('pt-MZ')}` : 'Validade conforme condições da proposta'}</p></div><button onClick={pdf} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-sm disabled:opacity-50"><Download className="h-4 w-4" />Descarregar PDF</button></header>
          <div className="p-5 md:p-8"><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><caption className="mb-5 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">O que está incluído</caption><thead className="border-b text-xs text-slate-500"><tr><th className="pb-3">Artigo e especificações</th><th className="pb-3 text-right">Qtd.</th><th className="pb-3 text-right">Preço unit.</th><th className="pb-3 text-right">Total</th></tr></thead><tbody>{proposal.items.map((item, i) => <tr key={i} className="border-b border-slate-100 align-top"><td className="max-w-lg py-4 pr-5"><p className="font-semibold">{item.description}</p><p className="mt-1 text-xs text-slate-500">{item.specifications}</p>{item.configuration?.selections?.map((entry, j) => <p key={j} className="mt-1 text-xs text-slate-500">{entry.label}: {entry.value}</p>)}{item.notes ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">{item.notes}</p> : null}{item.apparel?.rows?.length ? <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">Distribuição por modelo, cor e tamanho</summary><ul className="mt-2 space-y-1">{item.apparel.rows.map((row, j) => <li key={j}>{row.model} · {row.color} · {row.size}: {row.quantity}</li>)}</ul></details> : item.apparel?.pending ? <p className="mt-2 text-xs">Distribuição de vestuário por confirmar.</p> : null}</td><td className="py-4 text-right tabular-nums">{item.quantity}</td><td className="py-4 pl-4 text-right whitespace-nowrap">{item.unit_price == null ? 'A definir' : formatMZN(item.unit_price)}</td><td className="py-4 pl-4 text-right whitespace-nowrap">{item.unit_price == null ? 'A definir' : formatMZN(Number(item.unit_price) * item.quantity)}</td></tr>)}</tbody></table></div>
            <div className="mt-7 grid gap-7 md:grid-cols-2"><div className="space-y-5 text-sm"><div><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Prazo e pagamento</h3><p className="mt-2">{proposal.delivery_days ? `${proposal.delivery_days} dias úteis estimados após adjudicação.` : 'Prazo a confirmar com a MP.'}</p><p className="mt-2">{proposal.payment}</p></div>{proposal.notes ? <div><h3 className="text-xs font-semibold text-slate-500">Observações</h3><p className="mt-2 whitespace-pre-wrap leading-6">{proposal.notes}</p></div> : null}</div><dl className="space-y-3 rounded-xl bg-[#f3f5ef] p-5 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMZN(proposal.subtotal)}</dd></div><div className="flex justify-between"><dt>Desconto</dt><dd>{formatMZN(proposal.discount)}</dd></div><div className="flex justify-between"><dt>{proposal.vat_exempt ? 'Isento de IVA' : `IVA (${Number(proposal.tax_rate)}%)`}</dt><dd>{formatMZN(proposal.tax_amount)}</dd></div><div className="flex flex-wrap justify-between gap-3 border-t border-[#c8d4c4] pt-4 text-xl font-semibold"><dt>Total</dt><dd>{formatMZN(proposal.total)}</dd></div></dl></div>
            {proposal.terms ? <div className="mt-7 border-t pt-5"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Condições comerciais</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{proposal.terms}</p></div> : null}
          </div></section>
        <section className="rounded-2xl border border-[#dce2d5] bg-white p-6 md:p-8" aria-label="Decisão da proposta">
          {proposal.decision ? <div role="status"><Check className="mb-3 h-6 w-6 text-brand-700" /><h2 className="text-xl font-semibold">{decisionLabels[proposal.decision.client_decision]}</h2><p className="mt-3 text-sm text-slate-500">A sua decisão ficou registada. A Recepção dará seguimento aos próximos passos.</p></div> : proposal.expired ? <p role="status">Esta proposta expirou. Contacte a Recepção para atualizar as condições antes de responder.</p> : <form onSubmit={respond}><h2 className="text-xl font-semibold">Como pretende avançar?</h2><p className="mt-2 text-sm text-slate-500">Aceitar confirma estas condições comerciais. Não confirma pagamento nem autoriza automaticamente a produção.</p><fieldset disabled={busy} className="mt-5 space-y-5"><legend className="sr-only">Escolha a sua decisão</legend><div className="flex flex-wrap gap-3">{(['accept', 'changes', 'decline'] as const).map((value) => <label key={value} className={`cursor-pointer rounded-xl border px-4 py-3 text-sm ${action === value ? 'border-[#173f30] bg-[#edf2e8]' : ''}`}><input type="radio" name="decision" checked={action === value} onChange={() => { setAction(value); setConfirmed(false); }} className="mr-2" />{{ accept: 'Aceitar proposta', changes: 'Pedir alterações', decline: 'Recusar proposta' }[value]}</label>)}</div><label className="block text-sm font-medium">O seu nome<input required maxLength={160} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 block w-full max-w-lg rounded-xl border p-3" /></label><label className="block text-sm font-medium">{action === 'accept' ? 'Comentário (opcional)' : 'O que pretende alterar ou qual é o motivo?'}<textarea required={action !== 'accept'} maxLength={3000} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="mt-2 block w-full rounded-xl border p-3" /></label><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />Confirmo que revi a versão {proposal.version} e que posso comunicar esta decisão em nome do cliente.</label><button disabled={!confirmed || !name.trim()} className="flex items-center gap-2 rounded-xl bg-[#173f30] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Confirmar decisão<ArrowRight className="h-4 w-4" /></button></fieldset></form>}
        </section>
        {!reference ? <details className="rounded-2xl border border-[#dce2d5] bg-white p-6"><summary className="cursor-pointer text-sm font-semibold">Tem alguma dúvida? Fale com a Recepção sobre esta proposta.</summary><form onSubmit={ask} className="mt-4"><label className="block text-sm">A sua pergunta<textarea required rows={3} maxLength={4000} value={question} onChange={(e) => setQuestion(e.target.value)} className="mt-2 block w-full rounded-xl border p-3" /></label><button disabled={busy || !question.trim()} className="mt-3 rounded-xl bg-[#173f30] px-4 py-3 text-sm text-white disabled:opacity-50">Enviar pergunta</button>{notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}<p className="mt-3 text-xs text-slate-500">A proposta fica associada à mensagem. As respostas da Recepção não são instantâneas.</p></form></details> : null}
      </> : null}
      {!reference ? <aside className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#d8c58e] bg-[#faf7ec] p-6"><div><p className="text-xs uppercase tracking-[.15em] text-[#92763f]">BrandDesk by ETIOS</p><h2 className="mt-2 text-lg font-semibold">A sua marca, sempre acompanhada.</h2><p className="mt-2 max-w-xl text-sm text-slate-500">Centralize pedidos, aprovações, documentos e o histórico da sua empresa. Criar conta é opcional e não altera a sua decisão.</p></div><div className="flex flex-wrap gap-4 text-sm font-semibold"><Link href="/area-cliente/registo" className="rounded-xl bg-[#173f30] px-4 py-3 text-white">Criar a minha conta</Link><Link href="/area-cliente" className="px-2 py-3 underline">Já tenho conta</Link></div></aside> : null}
    </div></Root>;
}
