import { materialBriefingLines, type MaterialBriefing } from '@/lib/material-briefing';

export function MaterialBriefingSummary({ value, notes }: { value?: MaterialBriefing; notes?: string }) {
  const lines = materialBriefingLines(value?.apparel ? { ...value, apparel: undefined } : value);
  if (!lines.length && !notes && !value?.apparel) return null;
  return <div className="mt-2 space-y-1 whitespace-pre-wrap text-xs font-normal text-slate-600">
    {notes ? <p>{notes}</p> : null}
    {lines.map((line) => <p key={line}>{line}</p>)}
    {value?.apparel && <div className="mt-3 overflow-x-auto rounded-lg border bg-white p-2"><p className="mb-2 font-semibold text-brand-800">{value.apparel.pending ? 'Distribuição por confirmar' : 'Distribuição de vestuário'}</p>{value.apparel.rows.length > 0 && <table className="w-full text-left text-xs"><thead><tr><th className="p-1">Modelo</th><th className="p-1">Cor</th><th className="p-1">Tamanho</th><th className="p-1 text-right">Qtd.</th></tr></thead><tbody>{value.apparel.rows.map((row) => <tr key={`${row.model}-${row.color}-${row.size}`} className="border-t"><td className="p-1">{row.model}</td><td className="p-1">{row.color}</td><td className="p-1">{row.size}</td><td className="p-1 text-right tabular-nums">{row.quantity}</td></tr>)}</tbody></table>}<p className="mt-2">{[value.apparel.technique, value.apparel.placement].filter(Boolean).join(' · ')}</p>{value.apparel.notes && <p>{value.apparel.notes}</p>}</div>}
  </div>;
}
