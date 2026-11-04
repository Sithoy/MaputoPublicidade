import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import LoginPage from './page';
import { login } from '@/lib/auth';
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/auth', () => ({ login: vi.fn() }));
vi.mock('@/components/TestCredentialsButton', () => ({ TestCredentialsButton: () => null }));
beforeEach(() => { vi.clearAllMocks(); });
async function submit() {
  render(<LoginPage />);
  const fields = screen.getAllByRole('textbox');
  fireEvent.change(fields[0], { target: { value: 'client@example.test' } });
  fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: crypto.randomUUID() } });
  fireEvent.submit(document.querySelector('form')!);
  await waitFor(() => expect(push).toHaveBeenCalled());
}
it('returns the client to the same review after successful login', async () => {
  window.history.replaceState({}, '', '/area-cliente/login?next=%2Farea-cliente%2Forcamentos%2FMP-0001-2026%23proposta');
  vi.mocked(login).mockResolvedValue({ data: { user: { is_staff: false } } } as never);
  await submit();
  expect(push).toHaveBeenCalledWith('/area-cliente/orcamentos/MP-0001-2026#proposta');
});
it('rejects an external return target', async () => {
  window.history.replaceState({}, '', '/area-cliente/login?next=https%3A%2F%2Fevil.example');
  vi.mocked(login).mockResolvedValue({ data: { user: { is_staff: false } } } as never);
  await submit();
  expect(push).toHaveBeenCalledWith('/area-cliente');
});
it('retains staff routing rather than granting client-account access', async () => {
  window.history.replaceState({}, '', '/area-cliente/login?next=%2Farea-cliente%2Forcamentos%2FMP-0001-2026%23arte');
  vi.mocked(login).mockResolvedValue({ data: { user: { is_staff: true } } } as never);
  await submit();
  expect(push).toHaveBeenCalledWith('/admin');
});
