import { MaterialBriefingSummary } from '@/components/MaterialBriefingSummary';
import { QuoteRequestEvidence } from '@/components/QuoteRequestEvidence';
import type { Job } from './ProductionWorkspace';

export function SharedJobBriefing({ job }: { job: Job }) {
  const brief = job.briefing;
  return <section className="space-y-5" aria-label="Briefing partilhado"><div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5"><h3 className="text-lg font-semibold text-brand-900">Briefing do pedido</h3><p className="mt-1 text-xs text-slate-500">O mesmo briefing completado pela Recepção. Studio e Produção consultam os dados atuais, sem criar outro formulário.</p>
    {brief?.project_name ? <p className="mt-4 font-semibold">{brief.project_name}</p> : null}{brief?.description ? <p className="mt-2 whitespace-pre-wrap text-sm">{brief.description}</p> : null}
    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{brief?.deadline ? <div><dt className="text-xs text-slate-500">Data pretendida pelo cliente · a confirmar</dt><dd>{brief.deadline}</dd></div> : null}{brief?.fulfilment ? <div><dt className="text-xs text-slate-500">Recepção do trabalho</dt><dd>{{ pickup: 'Levantamento na MP', delivery: 'Entrega', installation: 'Entrega e instalação' }[brief.fulfilment]}</dd></div> : null}{brief?.delivery_address ? <div><dt className="text-xs text-slate-500">Local de entrega / instalação</dt><dd className="whitespace-pre-wrap">{brief.delivery_address}</dd></div> : null}{brief?.source_reference ? <div><dt className="text-xs text-slate-500">Trabalho anterior</dt><dd>{brief.source_reference}</dd></div> : null}</dl>
    {brief?.questions ? <p className="mt-4 whitespace-pre-wrap rounded-xl bg-amber-50 p-3 text-sm">Por confirmar: {brief.questions}</p> : null}</div>
    <ul className="space-y-3">{job.items.map((item) => <li key={item.id} className="rounded-xl border p-4 text-sm"><p className="font-semibold">{item.quantity} × {item.description}</p><p className="mt-1 text-slate-500">{[item.size, item.material, item.colors].filter(Boolean).join(' · ')}</p>{item.notes ? <p className="mt-2 whitespace-pre-wrap">{item.notes}</p> : null}<MaterialBriefingSummary value={item.material_briefing} /></li>)}</ul>
    <QuoteRequestEvidence scope="production" title="Logótipos, amostras e referências" quote={{ reference: job.reference, request_attachments: job.references }} />
  </section>;
}
