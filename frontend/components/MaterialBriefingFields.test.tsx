import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { MaterialBriefingFields } from './MaterialBriefingFields';
import { type MaterialBriefing, materialBriefingLines } from '@/lib/material-briefing';

function Harness({ initial = {} }: { initial?: MaterialBriefing }) {
  const [value, setValue] = useState(initial);
  return <MaterialBriefingFields id="test" value={value} onChange={setValue} />;
}

describe('Contextual material briefing', () => {
  it.each(['paper', 'promotional'])('does not show site options for %s', (work_type) => {
    render(<Harness initial={{ work_type: work_type as MaterialBriefing['work_type'] }} />);
    expect(screen.queryByLabelText('Tenho medidas a indicar')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Precisa de instalação / aplicação')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Precisa de visita / avaliação presencial')).not.toBeInTheDocument();
  });
  it('reveals subforms only when requested and retains their values', () => {
    render(<Harness initial={{ work_type: 'space' }} />);
    expect(screen.queryByLabelText('Local e disponibilidade para visita')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Precisa de visita / avaliação presencial'));
    fireEvent.change(screen.getByLabelText('Local e disponibilidade para visita'), { target: { value: 'Matola, terça-feira' } });
    fireEvent.click(screen.getByLabelText('Precisa de visita / avaliação presencial'));
    expect(screen.queryByLabelText('Local e disponibilidade para visita')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Precisa de visita / avaliação presencial'));
    expect(screen.getByLabelText('Local e disponibilidade para visita')).toHaveValue('Matola, terça-feira');
  });
  it('retains existing site details after a type change', () => {
    render(<Harness initial={{ work_type: 'vehicle', needs_installation: true, installation_notes: 'Aplicar na viatura na MP' }} />);
    fireEvent.change(screen.getByLabelText('Tipo de trabalho'), { target: { value: 'paper' } });
    expect(screen.getByLabelText('Local e indicações de instalação')).toHaveValue('Aplicar na viatura na MP');
    expect(screen.getByText(/Detalhes anteriores mantidos/)).toBeVisible();
    expect(screen.queryByLabelText('Precisa de visita / avaliação presencial')).not.toBeInTheDocument();
  });
  it('does not present unchecked retained notes as requested services', () => {
    expect(materialBriefingLines({ work_type: 'paper', needs_installation: false, installation_notes: 'Old notes' })).toEqual(['Papelaria e impressos']);
  });
});
