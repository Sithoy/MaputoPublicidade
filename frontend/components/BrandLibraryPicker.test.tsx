import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBrandAssets } from '@/lib/client-api';
import type { BrandAsset } from '@/lib/api';
import { BrandLibraryPicker } from './BrandLibraryPicker';

vi.mock('@/lib/client-api', () => ({ getBrandAssets: vi.fn() }));
const asset: BrandAsset = { id: 7, name: 'Logótipo principal', kind: 'logo', file: '/api/brand-assets/7/file/', file_name: 'logo.pdf', file_size: 100, created_at: '2026-10-24T12:00:00Z' };
function Picker() { const [selected, setSelected] = useState<BrandAsset[]>([]); return <BrandLibraryPicker selected={selected} onChange={setSelected} />; }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getBrandAssets).mockResolvedValue([asset]); });

describe('Library selection', () => {
  it('loads on demand and keeps selected materials when closed', async () => {
    render(<Picker />);
    expect(getBrandAssets).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Escolher da Biblioteca' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Logótipo principal/ }));
    expect(screen.getByRole('status')).toHaveTextContent('1 material(is) selecionado(s)');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Biblioteca' }));
    expect(screen.getByRole('status')).toHaveTextContent('Logótipo principal');
    fireEvent.click(screen.getByRole('button', { name: 'Escolher da Biblioteca' }));
    expect(screen.getByRole('checkbox', { name: /Logótipo principal/ })).toBeChecked();
    expect(getBrandAssets).toHaveBeenCalledTimes(1);
  });
  it('allows retry without dropping the current request', async () => {
    vi.mocked(getBrandAssets).mockRejectedValueOnce(new Error('Offline'));
    render(<Picker />);
    fireEvent.click(screen.getByRole('button', { name: 'Escolher da Biblioteca' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('checkbox', { name: /Logótipo principal/ })).toBeInTheDocument();
  });
});
