import { apparelLines } from './apparel';

export const workTypes = {
  apparel: 'Vestuário e uniformes',
  other: 'Outro / ainda não sei',
  paper: 'Papelaria e impressos',
  promotional: 'Brindes e têxteis',
  vehicle: 'Personalização de viaturas',
  space: 'Personalização de espaços',
  signage: 'Sinalética e comunicação visual',
} as const;
export type WorkType = keyof typeof workTypes;
export type MaterialBriefing = {
  catalogue_configuration?: import('./product-configuration').CatalogueConfiguration;
  apparel?: import('./apparel').ApparelDistribution;
  work_type?: WorkType;
  needs_dimensions?: boolean;
  dimensions?: string;
  needs_installation?: boolean;
  installation_notes?: string;
  needs_visit?: boolean;
  visit_notes?: string;
};
export function supportsSiteWork(type: WorkType = 'other') {
  return ['other', 'vehicle', 'space', 'signage'].includes(type);
}
export function materialBriefingLines(value?: MaterialBriefing): string[] {
  if (!value) return [];
  return [...(value.catalogue_configuration?.selections || []).map(row => `${row.label}: ${row.value}`), ...apparelLines(value.apparel), value.work_type ? workTypes[value.work_type] : '',
    value.needs_dimensions ? `Medidas: ${value.dimensions || 'a confirmar'}` : '',
    value.needs_installation ? `Instalação / aplicação: ${value.installation_notes || 'detalhes a confirmar'}` : '',
    value.needs_visit ? `Visita / avaliação: ${value.visit_notes || 'a combinar'}` : '',
  ].filter(Boolean);
}
