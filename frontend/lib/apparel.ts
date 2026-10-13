export type ApparelOptions = { models: string[]; colors: string[]; sizes: string[]; techniques?: string[]; placements?: string[] };
export type ApparelRow = { model: string; color: string; size: string; quantity: number };
export type ApparelDistribution = { pending: boolean; rows: ApparelRow[]; technique?: string; placement?: string; notes?: string };
export const apparelTotal = (value?: ApparelDistribution) => (value?.rows || []).reduce((total, row) => total + row.quantity, 0);
export function apparelLines(value?: ApparelDistribution): string[] {
  if (!value) return [];
  return [value.pending ? 'Distribuição de vestuário por confirmar' : 'Distribuição de vestuário', ...value.rows.map((row) => `${row.model} · ${row.color} · ${row.size}: ${row.quantity}`), value.technique ? `Personalização: ${value.technique}` : '', value.placement ? `Posição: ${value.placement}` : '', value.notes || ''].filter(Boolean);
}
