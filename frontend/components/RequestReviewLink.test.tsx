import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RequestReviewLink } from './RequestReviewLink';

it('requests staff help once without receiving a new link or approving anything', async () => {
  const request = vi.fn().mockResolvedValue({ detail: 'A Recepção irá contactar o destinatário registado.' });
  render(<RequestReviewLink request={request} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pedir novo link' }));
  expect(await screen.findByRole('status')).toHaveTextContent('A Recepção irá contactar');
  expect(screen.queryByRole('button', { name: 'Pedir novo link' })).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledOnce();
  expect(screen.getByRole('link', { name: 'Entrar no BrandDesk' })).toHaveAttribute('href', '/area-cliente');
});
