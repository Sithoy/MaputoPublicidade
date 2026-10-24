'use client';

import { useState } from 'react';

export function RequestReferenceUpload({ files, onChange, disabled = false }: {
  files: File[]; onChange: (files: File[]) => void; disabled?: boolean;
}) {
  const [error, setError] = useState('');
  return <fieldset disabled={disabled} className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4"><legend className="px-1 text-sm font-semibold">Amostras, logótipo e referências</legend>
    <p className="text-sm text-slate-600">Já tem um logótipo ou um exemplo do resultado? Junte-o aqui. A Recepção e o Studio usam estes ficheiros no mesmo pedido, sem precisar de os reenviar.</p>
    <label className="block text-sm font-medium">Juntar ficheiros<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.docx" className="mt-2 block w-full text-sm" onChange={(event) => {
      const next = [...files, ...Array.from(event.target.files || [])]; event.target.value = '';
      if (next.length > 5 || next.some((file) => !file.size || file.size > 2 * 1024 * 1024) || next.reduce((sum, file) => sum + file.size, 0) > 3 * 1024 * 1024) { setError('Use até 5 ficheiros: 2 MB cada e 3 MB no total.'); return; }
      if (next.some((file) => !/\.(pdf|png|jpe?g|webp|csv|xlsx|docx)$/i.test(file.name))) { setError('Use PDF, JPG, PNG, WebP, CSV, XLSX ou DOCX.'); return; }
      setError(''); onChange(next);
    }} /></label>
    <p className="text-xs text-slate-500">Opcional · Até 5 ficheiros, 2 MB cada e 3 MB no total. Prefira PDF ou PNG de boa qualidade para logótipos. Os ficheiros são privados e não constituem aprovação de arte.</p>
    <ul className="space-y-2">{files.map((file, index) => <li key={`${index}-${file.name}`} className="flex items-center justify-between gap-3 text-sm"><span className="break-all">{file.name} · {Math.ceil(file.size / 1024)} KB</span><button type="button" aria-label={`Remover anexo ${file.name}`} onClick={() => { setError(''); onChange(files.filter((_, position) => position !== index)); }} className="shrink-0 rounded-lg border bg-white px-3 py-2">Remover</button></li>)}</ul>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
  </fieldset>;
}
