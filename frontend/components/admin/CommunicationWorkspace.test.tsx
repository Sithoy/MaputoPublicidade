import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithAuth } from '@/lib/auth';
import { CommunicationWorkspace } from './CommunicationWorkspace';

let query = '';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query) }));
vi.mock('@/lib/auth', () => ({ fetchWithAuth: vi.fn() }));
vi.mock('@/components/SupportDesk', () => ({ SupportDesk: ({ channelGroup }: { channelGroup: string }) => <p>Conversas: {channelGroup}</p> }));
vi.mock('./EmailDesk', () => ({ EmailDesk: ({ onDirtyChange }: { onDirtyChange: (value: boolean) => void }) => <button onClick={() => onDirtyChange(true)}>Editor de email</button> }));
beforeEach(() => { query = ''; vi.clearAllMocks(); vi.mocked(fetchWithAuth).mockResolvedValue({ email: 2, email_unread: 1, conversations: 3, conversation_unread: 2, stages: { new: 2 } }); });
afterEach(() => vi.restoreAllMocks());

describe('Communication channels', () => {
  it('separates emails and conversations with unread counts', async () => {
    render(<CommunicationWorkspace />);
    expect(await screen.findByRole('tab', { name: 'Email 1 por ler' })).toHaveAttribute('aria-selected', 'true');
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Conversas 2 por ler' })); });
    expect(screen.getByText('Conversas: conversations')).toBeInTheDocument();
  });
  it('protects unsaved email work when changing channel', async () => {
    render(<CommunicationWorkspace />);
    await screen.findByRole('tab', { name: 'Conversas 2 por ler' });
    fireEvent.click(screen.getByRole('button', { name: 'Editor de email' }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('tab', { name: 'Conversas 2 por ler' }));
    expect(screen.getByRole('button', { name: 'Editor de email' })).toBeInTheDocument();
    expect(window.confirm).toHaveBeenCalledOnce();
  });
  it('resolves existing notification links to the correct channel without render loops', async () => {
    query = 'conversa=7';
    vi.mocked(fetchWithAuth).mockImplementation(async (path) => path.endsWith('/7/') ? { channel: 'branddesk' } : { email: 1, email_unread: 0, conversations: 1, conversation_unread: 1, stages: {} });
    render(<CommunicationWorkspace />);
    await waitFor(() => expect(screen.getByText('Conversas: conversations')).toBeInTheDocument());
    expect(vi.mocked(fetchWithAuth).mock.calls.filter(([path]) => path.endsWith('/7/'))).toHaveLength(1);
  });
  it('protects unsaved work when a new channel link arrives', async () => {
    const { rerender } = render(<CommunicationWorkspace />);
    await screen.findByRole('tab', { name: 'Conversas 2 por ler' });
    fireEvent.click(screen.getByRole('button', { name: 'Editor de email' }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    query = 'canal=conversas';
    rerender(<CommunicationWorkspace />);
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Editor de email' })).toBeInTheDocument();
  });
});
