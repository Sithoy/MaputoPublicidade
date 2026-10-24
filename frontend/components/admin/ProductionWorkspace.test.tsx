import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { ProductionWorkspace } from './ProductionWorkspace';

let allowed = true;
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn(), fetchBlobWithAuth: vi.fn() }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ loading: false, can: () => allowed }) }));
const job = { reference: 'MP-0001-2026', client_name: 'Empresa ABC', status: 'approved', order_reference: 'ORD-0001', production_notes: 'Confirmar cores', scheduled_date: null, items: [{ id: 1, description: 'Cartões de visita', quantity: 200, size: '85x55', material: 'Papel mate', colors: 'Verde' }], versions: [] };
beforeEach(() => { allowed = true; vi.resetAllMocks(); vi.mocked(fetchWithAuth).mockImplementation(async (path) => path === '/api/production/' ? { results: [job], next: null } : job); });
describe('Production workspace', () => {
  it('has a technical workspace and does not fetch financial APIs', async () => {
    render(<ProductionWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026/ }));
    expect(await screen.findByText('Próxima ação')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Briefing técnico/ }));
    expect(screen.getByLabelText('Notas técnicas da Produção')).toHaveValue('Confirmar cores');
    fireEvent.click(screen.getByRole('button', { name: /Produzir e conferir/ }));
    expect(screen.getByRole('button', { name: 'Iniciar produção' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Arte e apreciação/ })).not.toBeInTheDocument();
    expect(vi.mocked(fetchWithAuth).mock.calls.every(([path]) => path.startsWith('/api/production/'))).toBe(true);
    expect(screen.queryByText('Saldo em dívida')).not.toBeInTheDocument();
  });
  it('does not fetch the workspace without permission', () => {
    allowed = false;
    render(<ProductionWorkspace />);
    expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso');
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
  it('provides a dedicated Studio workspace with persistent per-item artwork routes', async () => {
    const artJob = { ...job, items: [{ ...job.items[0], needs_design: true }], operation: { stage: 'studio', label: 'Preparar arte', needs_art: true, art_ready: false, can_start: false }, artwork_routes: [{ item_id: 1, requirement: 'studio' }] };
    vi.mocked(fetchWithAuth).mockImplementation(async (path) => path === '/api/production/' ? { results: [artJob], next: null } : artJob);
    render(<ProductionWorkspace workspace="studio" />);
    fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026/ }));
    expect(await screen.findByRole('heading', { name: 'Preparar o trabalho no Studio' })).toBeInTheDocument();
    expect(screen.getByLabelText('Arte de Cartões de visita')).toHaveValue('studio');
    expect(screen.queryByRole('button', { name: 'Iniciar produção' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Arte de Cartões de visita'), { target: { value: 'client' } });
    fireEvent.change(screen.getByLabelText('Verificação técnica / motivo da alteração'), { target: { value: 'Ficheiro fornecido pelo cliente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar requisitos de arte' }));
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/production/MP-0001-2026/requirements/', expect.objectContaining({ method: 'POST', body: JSON.stringify({ note: 'Ficheiro fornecido pelo cliente', items: [{ item_id: 1, requirement: 'client' }] }) }));
  });
  it('does not enable production for an artwork job even when selected manually', async () => {
    const artJob = { ...job, items: [{ ...job.items[0], needs_design: true }], operation: { stage: 'studio', label: 'Preparar arte', needs_art: true, art_ready: false, can_start: false } };
    vi.mocked(fetchWithAuth).mockImplementation(async (path) => path === '/api/production/' ? { results: [artJob], next: null } : artJob);
    render(<ProductionWorkspace />);
    fireEvent.change(screen.getByLabelText('Mostrar'), { target: { value: 'all' } });
    fireEvent.click(await screen.findByRole('button', { name: /MP-0001-2026/ }));
    await screen.findByText('Próxima ação');
    fireEvent.click(screen.getByRole('button', { name: /Produzir e conferir/ }));
    expect(screen.getByRole('button', { name: 'Iniciar produção' })).toBeDisabled();
  });
});
