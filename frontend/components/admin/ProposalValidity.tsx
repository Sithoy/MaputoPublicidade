'use client';

export function ProposalValidity({ value, legacyDate, onChange }: {
  value: 7 | 15 | 30 | 60 | null; legacyDate?: string; onChange: (days: 7 | 15 | 30 | 60 | null) => void;
}) {
  return <fieldset className="space-y-2"><legend className="text-sm font-medium text-gray-700">Validade da proposta</legend>
    <div className="flex flex-wrap gap-2">{([7, 15, 30, 60] as const).map((days) => <label key={days} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${value === days ? 'border-brand-700 bg-brand-50 font-semibold text-brand-900' : 'bg-white text-slate-600'}`}><input type="radio" name="proposal-validity" value={days} checked={value === days} onChange={() => onChange(days)} className="mr-2 accent-[#173f30]" />{days} dias</label>)}
      {legacyDate ? <label className="rounded-lg border px-3 py-2 text-sm"><input type="radio" name="proposal-validity" checked={value === null} onChange={() => onChange(null)} className="mr-2" />Manter data atual ({legacyDate.split('-').reverse().join('/')})</label> : null}
    </div>
    <p className="text-xs text-slate-500">Dias corridos a partir do envio ao cliente. Guardar um rascunho não inicia a contagem.</p>
  </fieldset>;
}
