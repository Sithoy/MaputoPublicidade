import Link from 'next/link';
import type { AdminQuote } from '@/lib/admin-api';
import { workflowStages } from '@/lib/workflow';
import { PrivateArtPreview } from '@/components/PrivateArtPreview';
import { OperationalDelivery } from './OperationalDelivery';

export function ReceptionOperationPanel({ quote, step, canOperate }: { quote: AdminQuote; step: number; canOperate: boolean }) {
  const journey = quote.journey;
  return <section className="space-y-4 rounded-2xl border bg-white p-5">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Acompanhamento do mesmo pedido</p><h3 className="mt-2 text-lg font-semibold text-brand-900">{workflowStages[step]?.shortLabel || 'Operação'}</h3><p className="mt-2 text-sm text-slate-500">Estado atual: {journey?.label || quote.operational_order_status || 'A aguardar confirmação'}</p></header>
    <dl className="grid gap-4 rounded-xl bg-brand-50/50 p-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Com quem está o próximo passo?</dt><dd className="mt-1 font-semibold">{journey?.team || 'Equipa MP'}</dd></div><div><dt className="text-xs text-slate-500">O que precisa de acontecer?</dt><dd className="mt-1">{journey?.next_action || 'Confirmar a ordem operacional'}</dd></div></dl>
    {journey?.blocker ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{journey.blocker}</p> : null}
    {step === 3 || step === 4 ? <section className="space-y-3"><h4 className="font-semibold">Artes partilhadas com o cliente</h4>{quote.proof_versions?.filter((version) => version.published_at).map((version) => <article key={version.id} className="space-y-2 rounded-xl border p-4"><p className="text-sm font-semibold">Versão {version.version} · {version.client_decision_display || version.client_decision}</p>{version.client_comment ? <p className="text-sm">Cliente: {version.client_comment}</p> : null}{version.files?.length ? version.files.map((file) => <PrivateArtPreview key={file.id} url={file.url} label={`Ver ${file.name}`} />) : <PrivateArtPreview url={version.file} label="Ver arte" />}</article>)}{!quote.proof_versions?.some((version) => version.published_at) ? <p className="text-sm text-slate-500">Ainda não há arte publicada para apreciação. A equipa de Artes prepara a versão neste pedido.</p> : null}</section> : null}
    {step === 5 ? <p className="text-sm text-slate-600">A produção utiliza o mesmo briefing, materiais e arte aprovada. Consulte Resumo para os detalhes e Seguimentos para combinar o próximo contacto.</p> : null}
    {step >= 6 && quote.order_reference ? <OperationalDelivery reference={quote.order_reference} readOnly /> : null}
    {canOperate && quote.order_reference ? <Link href={step >= 6 ? `/admin/entregas?encomenda=${encodeURIComponent(quote.order_reference)}` : `/admin/operacoes?pedido=${encodeURIComponent(quote.reference)}`} className="inline-block rounded-xl border px-4 py-3 text-sm font-semibold text-brand-900">Abrir espaço responsável →</Link> : null}
    <p className="text-xs text-slate-500">O percurso é o mesmo que o cliente vê no BrandDesk. A Recepção acompanha e comunica; a equipa responsável regista a execução.</p>
  </section>;
}
