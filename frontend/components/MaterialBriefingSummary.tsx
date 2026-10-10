import { materialBriefingLines, type MaterialBriefing } from '@/lib/material-briefing';

export function MaterialBriefingSummary({ value, notes }: { value?: MaterialBriefing; notes?: string }) {
  const lines = materialBriefingLines(value);
  if (!lines.length && !notes) return null;
  return <div className="mt-2 space-y-1 whitespace-pre-wrap text-xs font-normal text-slate-600">
    {notes ? <p>{notes}</p> : null}
    {lines.map((line) => <p key={line}>{line}</p>)}
  </div>;
}
