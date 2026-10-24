import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequestReferenceUpload } from './RequestReferenceUpload';

describe('Request reference upload', () => {
  it('accepts a client logo and preserves existing samples', () => {
    const sample = new File(['sample'], 'sample.pdf', { type: 'application/pdf' });
    const logo = new File(['png'], 'logo.png', { type: 'image/png' });
    const change = vi.fn();
    render(<RequestReferenceUpload files={[sample]} onChange={change} />);
    fireEvent.change(screen.getByLabelText('Juntar ficheiros'), { target: { files: [logo] } });
    expect(change).toHaveBeenCalledWith([sample, logo]);
    expect(screen.getByText(/não constituem aprovação de arte/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover anexo sample.pdf' }));
    expect(change).toHaveBeenLastCalledWith([]);
  });
  it('rejects active formats and oversized files without changing the selection', () => {
    const change = vi.fn();
    render(<RequestReferenceUpload files={[]} onChange={change} />);
    fireEvent.change(screen.getByLabelText('Juntar ficheiros'), { target: { files: [new File(['<svg/>'], 'logo.svg')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Use PDF');
    fireEvent.change(screen.getByLabelText('Juntar ficheiros'), { target: { files: [new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'logo.png')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('2 MB');
    expect(change).not.toHaveBeenCalled();
  });
});
