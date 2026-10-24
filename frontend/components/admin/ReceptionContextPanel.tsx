'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Native modal supplies focus trapping, background inertness and focus restoration. */
export function ReceptionContextPanel({ title, reference, onClose, children }: {
  title: string; reference: string; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}
    className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-none border-0 bg-[#fafbf7] p-0 text-brand-900 shadow-2xl backdrop:bg-[#102d24]/35 sm:w-[min(680px,90vw)]">
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#e1e6d8] bg-white px-5 py-4 sm:px-6">
        <div><p className="text-[10px] uppercase tracking-widest text-slate-500">{reference} · Contexto do pedido</p><h2 className="mt-1 text-lg font-semibold">{title}</h2></div>
        <button autoFocus type="button" aria-label="Fechar painel" title="Fechar painel (Esc)" onClick={onClose} className="rounded-xl border p-2.5 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700"><X aria-hidden="true" className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">{children}</div>
    </div>
  </dialog>;
}
