// Presentation groups only: the shared Reception/BrandDesk journey stays intact.
export const workBoardColumns = [
  { key: 'requests', label: 'Novos pedidos', stages: ['briefing'] },
  { key: 'proposals', label: 'Propostas', stages: ['proposal', 'client'] },
  { key: 'art', label: 'Arte', stages: ['art', 'art_client'] },
  { key: 'production', label: 'Produção', stages: ['production'] },
  { key: 'ready', label: 'Pronto para entrega', stages: ['delivery'] },
];
export const completedColumn = { key: 'completed', label: 'Entregues · Histórico', stages: ['delivered'] };
export function boardColumn(stage: string) {
  return [...workBoardColumns, completedColumn].find(column => column.stages.includes(stage))?.key || 'active';
}
