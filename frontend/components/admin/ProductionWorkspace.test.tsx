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
    expect(await screen.findByLabelText('Notas técnicas da Produção')).toHaveValue('Confirmar cores');
    expect(screen.getByRole('button', { name: 'Iniciar produção' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar nova versão em rascunho' })).toBeDisabled();
    expect(vi.mocked(fetchWithAuth).mock.calls.every(([path]) => path.startsWith('/api/production/'))).toBe(true);
    expect(screen.queryByText('Saldo em dívida')).not.toBeInTheDocument();
  });
  it('does not fetch the workspace without permission', () => {
    allowed = false;
    render(<ProductionWorkspace />);
    expect(screen.getByRole('alert')).toHaveTextContent('não tem acesso');
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
});
