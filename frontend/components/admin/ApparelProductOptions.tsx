'use client';

import type { ApparelOptions } from '@/lib/apparel';

export function ApparelProductOptions({ initial }: { initial?: ApparelOptions }) {
  const fields = [['models', 'Modelos disponíveis', 'Masculino, Feminino, Unissexo'], ['colors', 'Cores disponíveis', ''], ['sizes', 'Tamanhos disponíveis', 'S, M, L, XL'], ['techniques', 'Personalização disponível', 'Bordado, Impressão'], ['placements', 'Posições de personalização', 'Peito esquerdo, Costas']] as const;
  return <fieldset className="space-y-3 rounded-xl border border-[#dce3d5] bg-[#f6f7ef] p-4"><legend className="px-2 text-sm font-semibold text-brand-800">Configuração de vestuário</legend><p className="text-xs leading-5 text-slate-500">Indique apenas as opções que a MP disponibiliza. O pedido gera uma grelha de modelo × cor × tamanho. Estas opções não definem stock nem preços finais.</p>{fields.map(([key, label, fallback]) => <label key={key} className="block text-sm">{label}<input name={`apparel_${key}`} required={['models', 'colors', 'sizes'].includes(key)} maxLength={480} defaultValue={initial?.[key]?.join(', ') ?? fallback} placeholder={key === 'colors' ? 'Ex.: Verde, Branco' : undefined} className="mt-2 w-full rounded-lg border bg-white p-3" /><span className="mt-1 block text-[11px] text-slate-500">Separe as opções por vírgula.</span></label>)}</fieldset>;
}
