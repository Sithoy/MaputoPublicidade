import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { StaffSignatures } from './StaffSignatures';

vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
const row = { user_id: 3, email: 'maria@example.com', display_name: 'Maria Manuel', title: 'Atendimento', approved: false, approved_by: null };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue([row]); });
describe('Approved email signatures', () => {
  it('requires explicit approval and records the selected account', async () => {
    render(<StaffSignatures />);
    fireEvent.click(await screen.findByRole('button', { name: /Maria Manuel/ }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar assinatura e autorização' }));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledWith('/api/staff-email-signatures/', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ user_id: 3, display_name: 'Maria Manuel', title: 'Atendimento', approved: true }) })));
  });
  it('fails gracefully when the API returns invalid data', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({});
    render(<StaffSignatures />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as assinaturas.');
  });
});
