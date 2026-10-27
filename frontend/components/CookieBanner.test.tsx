import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { CookieBanner } from './CookieBanner';
import { TRAFFIC_CONSENT } from '@/lib/website-traffic';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it('offers separate optional analytics consent even after an old cookie acceptance', () => {
  localStorage.setItem('mp_cookie_consent', 'accepted');
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole('button', { name: 'Apenas essenciais' }));
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe('denied');
  fireEvent.click(screen.getByRole('button', { name: 'Preferências de privacidade' }));
  fireEvent.click(screen.getByRole('button', { name: 'Permitir análise' }));
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe('granted');
});
it('allows an existing analytics consent to be withdrawn', () => {
  localStorage.setItem(TRAFFIC_CONSENT, 'granted');
  localStorage.setItem('mp_analytics_visitor_v1', 'fixture');
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole('button', { name: 'Preferências de privacidade' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apenas essenciais' }));
  expect(localStorage.getItem('mp_analytics_visitor_v1')).toBeNull();
});
