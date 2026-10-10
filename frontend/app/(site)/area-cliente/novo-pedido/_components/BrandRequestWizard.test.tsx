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
  it('keeps optional sections compact for clients who need guidance', async () => {
    render(<BrandRequestWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Preciso de ajuda/ }));
    await screen.findByText('Empresa Horizonte');
    expect(screen.getByRole('button', { name: 'Adicionar material' })).not.toBeVisible();
    expect(screen.getByLabelText('Prioridade')).not.toBeVisible();
    expect(screen.getByLabelText('Anexos e referências')).not.toBeVisible();
    fireEvent.click(screen.getByText('Materiais que já conhece').closest('summary')!);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Adicionar material' })).toBeVisible());
  });
  it('preserves collapsed material specifications through review and edit', async () => {
    render(<BrandRequestWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Preciso de um orçamento/ }));
    await screen.findByText('Empresa Horizonte');
    fireEvent.change(screen.getByLabelText('Nome do pedido *'), { target: { value: 'Roll-up institucional' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar material' }));
    fireEvent.change(screen.getByLabelText('Produto ou serviço *'), { target: { value: 'Roll-up' } });
    fireEvent.change(screen.getByLabelText('Quantidade *'), { target: { value: '2' } });
    const summary = screen.getByText('Detalhes do material 1').closest('summary')!;
    fireEvent.click(summary);
    const specifications = screen.getByLabelText('Medidas, acabamentos ou outras indicações');
    await waitFor(() => expect(specifications).toBeVisible());
    fireEvent.change(specifications, { target: { value: '85 x 200 cm' } });
    fireEvent.click(summary);
    await waitFor(() => expect(specifications).not.toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: 'Rever pedido' }));
    expect(screen.getByText('85 x 200 cm')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Editar briefing' }));
    expect(screen.getByLabelText('Medidas, acabamentos ou outras indicações')).toBeVisible();
    expect(screen.getByLabelText('Medidas, acabamentos ou outras indicações')).toHaveValue('85 x 200 cm');
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
    fireEvent.change(screen.getByLabelText('Anexos e referências'), { target: { files: [file] } });
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
