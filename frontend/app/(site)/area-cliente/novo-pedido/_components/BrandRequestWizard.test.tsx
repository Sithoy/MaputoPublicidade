import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrandRequestWizard } from './BrandRequestWizard';
import { createBrandRequest } from '@/lib/client-api';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/client-api', async (original) => ({ ...await original<typeof import('@/lib/client-api')>(),
  getMe: vi.fn().mockResolvedValue({ first_name: 'Ana', email: 'ana@example.com', profile: { company: 'Empresa Horizonte', nuit: '400123456' } }),
  createBrandRequest: vi.fn().mockResolvedValue({ reference: 'MP-0008-2026' }),
}));

describe('BrandDesk request wizard', () => {
  beforeEach(() => vi.clearAllMocks());
  it('sends different contexts in a mixed request, with delivery details', async () => {
    render(<BrandRequestWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Preciso de um orçamento/ }));
    await screen.findByText('Empresa Horizonte');
    fireEvent.change(screen.getByLabelText('Nome do pedido *'), { target: { value: 'Identidade da empresa' } });
    for (const [description, quantity, type] of [['Cadernos', '200', 'paper'], ['Viatura', '1', 'vehicle']]) {
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar material' }));
      fireEvent.change(screen.getAllByLabelText('Produto ou serviço *').at(-1)!, { target: { value: description } });
      fireEvent.change(screen.getAllByLabelText('Quantidade *').at(-1)!, { target: { value: quantity } });
      fireEvent.change(screen.getAllByLabelText('Tipo de trabalho').at(-1)!, { target: { value: type } });
    }
    expect(screen.getAllByLabelText('Precisa de instalação / aplicação')).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('Precisa de instalação / aplicação'));
    fireEvent.change(screen.getByLabelText('Local e indicações de instalação'), { target: { value: 'Aplicar logótipos nas portas' } });
    expect(screen.queryByLabelText('Endereço e indicações para entrega')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Preciso de entrega'));
    fireEvent.change(screen.getByLabelText('Endereço e indicações para entrega'), { target: { value: 'Escritório em Maputo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rever pedido' }));
    expect(screen.getByText('Instalação / aplicação: Aplicar logótipos nas portas')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    await waitFor(() => expect(createBrandRequest).toHaveBeenCalledOnce());
    expect(vi.mocked(createBrandRequest).mock.calls[0][0]).toMatchObject({ deliveryAddress: 'Escritório em Maputo',
      items: [{ material_briefing: { work_type: 'paper' } }, { material_briefing: { work_type: 'vehicle', needs_installation: true, installation_notes: 'Aplicar logótipos nas portas' } }] });
  });
  it('keeps optional sections compact for clients who need guidance', async () => {
    render(<BrandRequestWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Preciso de ajuda/ }));
    await screen.findByText('Empresa Horizonte');
    expect(screen.getByRole('button', { name: 'Adicionar material' })).not.toBeVisible();
    expect(screen.getByLabelText('Prioridade')).not.toBeVisible();
    expect(screen.getByLabelText('Juntar ficheiros')).toBeVisible();
    fireEvent.click(screen.getByText('Materiais que já conhece').closest('summary')!);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Adicionar material' })).toBeVisible());
  });
  it('preserves free descriptions through review and edit without a technical template', async () => {
    render(<BrandRequestWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Preciso de um orçamento/ }));
    await screen.findByText('Empresa Horizonte');
    fireEvent.change(screen.getByLabelText('Nome do pedido *'), { target: { value: 'Roll-up institucional' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar material' }));
    fireEvent.change(screen.getByLabelText('Produto ou serviço *'), { target: { value: 'Roll-up' } });
    fireEvent.change(screen.getByLabelText('Quantidade *'), { target: { value: '2' } });
    const specifications = screen.getByLabelText('Descrição livre e referências');
    await waitFor(() => expect(specifications).toBeVisible());
    fireEvent.change(specifications, { target: { value: '85 x 200 cm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rever pedido' }));
    expect(screen.getByText('85 x 200 cm')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Editar briefing' }));
    expect(screen.getByLabelText('Descrição livre e referências')).toBeVisible();
    expect(screen.getByLabelText('Descrição livre e referências')).toHaveValue('85 x 200 cm');
  });
  it('keeps materials and files while navigating and requires review before sending', async () => {
    render(<BrandRequestWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Tenho um evento/ }));
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    await screen.findByText('Empresa Horizonte');
    fireEvent.change(screen.getByLabelText('Nome do pedido *'), { target: { value: 'Conferência' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar material' }));
    fireEvent.change(screen.getByLabelText('Produto ou serviço *'), { target: { value: 'Rollups' } });
    fireEvent.change(screen.getByLabelText('Quantidade *'), { target: { value: '2' } });
    const file = new File(['%PDF-1.4'], 'brief.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Juntar ficheiros'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar objetivo' }));
    fireEvent.click(screen.getByRole('button', { name: /Preciso de um orçamento/ }));
    expect(screen.getByLabelText('Nome do pedido *')).toHaveValue('Conferência');
    expect(screen.getByLabelText('Quantidade *')).toHaveValue(2);
    expect(screen.getByText(/brief.pdf/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rever pedido' }));
    expect(createBrandRequest).not.toHaveBeenCalled();
    expect(screen.getByText('Rollups · 2 unidades')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar briefing' }));
    expect(screen.getByLabelText('Produto ou serviço *')).toHaveValue('Rollups');
    fireEvent.click(screen.getByRole('button', { name: 'Rever pedido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    await waitFor(() => expect(createBrandRequest).toHaveBeenCalledOnce());
    expect(vi.mocked(createBrandRequest).mock.calls[0][0]).toMatchObject({ items: [{ description: 'Rollups', quantity: 2 }], files: [file] });
    expect(await screen.findByRole('link', { name: 'Acompanhar pedido' })).toHaveAttribute('href', '/area-cliente/orcamentos/MP-0008-2026');
  });
  it('accepts guidance without an artificial product or quantity', async () => {
    render(<BrandRequestWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Preciso de ajuda/ }));
    await screen.findByText('Empresa Horizonte');
    fireEvent.change(screen.getByLabelText('Nome do pedido *'), { target: { value: 'Abertura de loja' } });
    fireEvent.change(screen.getByLabelText('O que pretende alcançar?'), { target: { value: 'Preciso de visibilidade para a inauguração.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rever pedido' }));
    expect(screen.getByText(/Não serão assumidos valores/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    await waitFor(() => expect(createBrandRequest).toHaveBeenCalledOnce());
    expect(vi.mocked(createBrandRequest).mock.calls[0][0].items).toEqual([]);
  });
});
