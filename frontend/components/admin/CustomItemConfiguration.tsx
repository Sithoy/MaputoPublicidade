'use client';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { MaterialBriefing } from '@/lib/material-briefing';
import { productTemplates, type ProductTemplate } from '@/lib/product-configuration';

export function CustomItemConfiguration({ id, value, onChange }: {
  id: string;
  value?: MaterialBriefing;
  onChange: (value: MaterialBriefing) => void;
}) {
  const template = value?.apparel ? 'apparel' : value?.catalogue_configuration?.template || 'standard';
  const selected = Object.fromEntries((value?.catalogue_configuration?.selections || []).map(row => [row.key, row.value]));

  function changeTemplate(next: ProductTemplate) {
    // Keep unrelated briefing context, but never carry incompatible technical details.
    const briefing = { ...value };
    delete briefing.apparel;
    delete briefing.catalogue_configuration;
    if (briefing.work_type === 'apparel') delete briefing.work_type;
    if (next !== 'standard') briefing.catalogue_configuration = { template: next, selections: [] };
    if (next === 'apparel') {
      briefing.work_type = 'apparel';
      briefing.apparel = { pending: true, rows: [] };
    }
    onChange(briefing);
  }

  return (
    <fieldset className="space-y-4 rounded-xl border border-[#dce5de] bg-white p-4">
      <legend className="px-2 text-sm font-semibold text-brand-800">Configuração do item personalizado</legend>
      <div>
        <Label htmlFor={`${id}-template`}>Modelo de configuração</Label>
        <select id={`${id}-template`} value={template}
          onChange={event => changeTemplate(event.target.value as ProductTemplate)}
          aria-describedby={`${id}-help`}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50">
          {Object.entries(productTemplates).map(([key, model]) => <option key={key} value={key}>{model.label}</option>)}
        </select>
        <p id={`${id}-help`} className="mt-2 text-xs text-slate-500">Não cria um produto no catálogo. Ao mudar o modelo, as especificações anteriores são limpas; a descrição e a quantidade mantêm-se.</p>
      </div>
      {template !== 'standard' ? <div className="grid gap-3 sm:grid-cols-2">
        {productTemplates[template].fields.map(field => (
          <div key={field.key}>
            <Label htmlFor={`${id}-${field.key}`}>{field.label}</Label>
            <Input id={`${id}-${field.key}`} maxLength={80} value={selected[field.key] || ''}
              placeholder="Opcional / por confirmar" className="mt-1"
              onChange={event => {
                const selections = { ...selected, [field.key]: event.target.value };
                onChange({ ...value, catalogue_configuration: {
                  template,
                  selections: productTemplates[template].fields.filter(row => selections[row.key]?.trim()).map(row => ({ ...row, value: selections[row.key] })),
                } });
              }} />
          </div>
        ))}
      </div> : null}
    </fieldset>
  );
}
