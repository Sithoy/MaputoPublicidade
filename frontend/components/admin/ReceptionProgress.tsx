'use client';

import { Check, ChevronRight } from 'lucide-react';
import { receptionSteps } from '@/lib/operational-workflow';

const labels = ['Briefing', 'Proposta', 'Cliente', 'Produção / entrega'];
export function ReceptionProgress({ current, selected, busy, onSelect }: {
  current: number; selected: number; busy: boolean; onSelect: (value: number) => void;
}) {
  return <nav aria-label="Percurso do pedido" className="desk-reception-progress"><ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">{labels.map((label, index) => <li key={label} className="relative min-w-0">
    <button type="button" disabled={busy} onClick={() => onSelect(index)} aria-label={`${index + 1} ${receptionSteps[index]}`} aria-current={index === current ? 'step' : undefined} aria-pressed={index === selected} data-phase={index < current ? 'past' : index === current ? 'current' : 'future'} className="flex h-full w-full items-start gap-2 rounded-xl border p-3 text-left">
      <span aria-hidden="true" className="desk-progress-marker flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">{index < current ? <Check className="h-3 w-3" /> : index + 1}</span>
      <span className="min-w-0"><span className="block text-xs font-semibold leading-4">{label}</span><span className="mt-1 block text-[10px]">{index < current ? 'Etapa anterior' : index === current ? 'Etapa atual' : 'Próxima etapa'}</span></span>
    </button>{index < labels.length - 1 ? <ChevronRight aria-hidden="true" className="absolute -right-3 top-5 z-10 hidden h-4 w-4 text-slate-300 sm:block" /> : null}
  </li>)}</ol></nav>;
}
