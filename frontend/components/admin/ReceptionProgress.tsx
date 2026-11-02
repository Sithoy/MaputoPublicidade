'use client';

import { Check, ChevronRight } from 'lucide-react';
import { receptionSteps } from '@/lib/operational-workflow';
import type { JobJourney } from '@/lib/workflow';

const labels = ['Briefing', 'Proposta', 'Decisão do cliente', 'Preparar arte', 'Aprovação da arte', 'Produção', 'Pronto para entrega', 'Entregue'];
export function ReceptionProgress({ current, selected, busy, onSelect, journey }: {
  journey?: JobJourney;
  current: number; selected: number; busy: boolean; onSelect: (value: number) => void;
}) {
  return <nav aria-label="Percurso do pedido" className="desk-reception-progress"><ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{labels.map((label, index) => <li key={label} className="relative min-w-0">
    <button type="button" disabled={busy || journey?.steps[index]?.skipped} onClick={() => onSelect(index)} aria-label={`${index + 1} ${receptionSteps[index]}`} aria-current={!journey?.cancelled && index === current ? 'step' : undefined} aria-pressed={index === selected} data-phase={index < current ? 'past' : index === current ? 'current' : 'future'} className="flex h-full w-full items-center gap-2 rounded-xl border px-3 py-2 text-left disabled:opacity-50">
      <span aria-hidden="true" className="desk-progress-marker flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">{journey?.steps[index]?.skipped ? '—' : index < current ? <Check className="h-3 w-3" /> : index + 1}</span>
      <span className="min-w-0"><span className="block text-xs font-semibold leading-4">{label}</span>{journey?.steps[index]?.skipped ? <span className="block text-[10px]">Não necessária</span> : <span className="sr-only">{index < current ? 'Etapa anterior' : index === current ? 'Etapa atual' : 'Próxima etapa'}</span>}</span>
    </button>{index < labels.length - 1 ? <ChevronRight aria-hidden="true" className="absolute -right-3 top-5 z-10 hidden h-4 w-4 text-slate-300 sm:block" /> : null}
  </li>)}</ol></nav>;
}
