'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** Closing a section only hides its controls; it never clears their values. */
export function BriefingDisclosure({ title, hint, defaultOpen = false, children }: {
  title: string; hint?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} onInvalidCapture={() => setOpen(true)} className="group rounded-xl border border-[#dfe7e1] bg-white">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-brand-900 outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
      <span>{title}{hint ? <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{hint}</span> : null}</span>
      <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <div className="space-y-4 border-t border-[#e7ece8] p-4">{children}</div>
  </details>;
}
