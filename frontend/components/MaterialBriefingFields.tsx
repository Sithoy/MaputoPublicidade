'use client';

import { type MaterialBriefing, supportsSiteWork, workTypes } from '@/lib/material-briefing';
import { ApparelMatrix } from './ApparelMatrix';

/** Optional capabilities, not a product-specific technical questionnaire. */
export function MaterialBriefingFields({ value = {}, onChange, id, quantity }: {
  value?: MaterialBriefing; onChange: (value: MaterialBriefing) => void; id: string; quantity?: number;
}) {
  const siteWork = supportsSiteWork(value.work_type);
  const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm';
  const options = [
    { flag: 'needs_dimensions', notes: 'dimensions', title: 'Tenho medidas a indicar', label: 'Medidas conhecidas', hint: 'Indique apenas as medidas que já conhece. Pode juntar uma imagem nas referências.' },
    { flag: 'needs_installation', notes: 'installation_notes', title: 'Precisa de instalação / aplicação', label: 'Local e indicações de instalação', hint: 'Local, condições de acesso ou indicações úteis. Não precisa de preencher um levantamento técnico.' },
    { flag: 'needs_visit', notes: 'visit_notes', title: 'Precisa de visita / avaliação presencial', label: 'Local e disponibilidade para visita', hint: 'Indique onde e quando podemos avaliar. A equipa confirma a marcação.' },
  ] as const;
  return <div className="space-y-4">
    <label htmlFor={`${id}-type`} className="block text-sm font-medium">Tipo de trabalho
      <select id={`${id}-type`} value={value.work_type || 'other'} onChange={(event) => onChange({ ...value, work_type: event.target.value as MaterialBriefing['work_type'] })} className={inputClass}>
        {Object.entries(workTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
    {(value.work_type === 'apparel' || value.apparel) && <ApparelMatrix id={id} quantity={quantity} value={value.apparel || { pending: true, rows: [] }} onChange={(apparel) => onChange({ ...value, apparel })} />}
    <p className="text-xs leading-5 text-slate-500">{value.work_type === 'vehicle' ? 'Descreva as zonas a personalizar e junte fotografias da viatura nas referências.' : value.work_type === 'space' ? 'Conte-nos o que pretende transformar e junte fotografias do espaço nas referências.' : 'Uma descrição livre e imagens de referência podem ser suficientes. Só acrescente o que se aplica.'}</p>
    {options.map(({ flag, notes, title, label, hint }) => siteWork || value[flag] || value[notes] ? <div key={flag} className="rounded-xl border border-slate-200 p-3">
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={Boolean(value[flag])} onChange={(event) => onChange({ ...value, [flag]: event.target.checked })} className="mt-1" />{title}</label>
      {value[flag] ? <div className="mt-3"><label htmlFor={`${id}-${notes}`} className="block text-sm">{label}</label><textarea id={`${id}-${notes}`} aria-describedby={`${id}-${notes}-hint`} rows={2} maxLength={2000} value={value[notes] || ''} onChange={(event) => onChange({ ...value, [notes]: event.target.value })} className={inputClass} /><p id={`${id}-${notes}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p></div> : null}
      {!siteWork && (value[flag] || value[notes]) ? <p className="mt-2 text-xs text-amber-800">Detalhes anteriores mantidos. Confirme se ainda se aplicam a este trabalho.</p> : null}
    </div> : null)}
  </div>;
}
