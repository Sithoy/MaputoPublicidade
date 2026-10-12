'use client';

export function OperationalSteps({ steps, current, selected, onSelect }: { steps: string[]; current: number; selected: number; onSelect: (index: number) => void }) {
  return <nav aria-label="Etapas do trabalho" className="overflow-x-auto"><ol className="flex min-w-max gap-2">{steps.map((step, index) => <li key={step}><button type="button" onClick={() => onSelect(index)} aria-current={index === current ? 'step' : undefined} aria-pressed={index === selected} className={`rounded-xl border px-4 py-3 text-left text-sm ${index === selected ? 'border-brand-800 bg-brand-800 text-white' : 'bg-white text-slate-600'}`}><span className="mr-2 text-xs">{index + 1}</span>{step}{index === current ? <span className="ml-2 text-xs">· atual</span> : null}</button></li>)}</ol></nav>;
}
