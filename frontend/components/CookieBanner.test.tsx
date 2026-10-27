import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { CookieBanner } from './CookieBanner';
import { setAnalyticsConsent, TRAFFIC_AGGREGATE, TRAFFIC_CONSENT } from '@/lib/website-traffic';

beforeEach(() => { setAnalyticsConsent(false); localStorage.clear(); sessionStorage.clear(); });
it('offers separate optional analytics consent even after an old cookie acceptance', () => {
  localStorage.setItem('mp_cookie_consent', 'accepted');
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole('button', { name: 'Só contagens agregadas' }));
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe('denied');
  fireEvent.click(screen.getByRole('button', { name: 'Preferências de privacidade' }));
  fireEvent.click(screen.getByRole('button', { name: 'Permitir análise detalhada' }));
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe('granted');
});
it('allows an existing analytics consent to be withdrawn', () => {
  localStorage.setItem(TRAFFIC_CONSENT, 'granted');
  localStorage.setItem(TRAFFIC_AGGREGATE, 'enabled');
  localStorage.setItem('mp_analytics_visitor_v1', 'fixture');
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole('button', { name: 'Preferências de privacidade' }));
  fireEvent.click(screen.getByRole('button', { name: 'Só contagens agregadas' }));
  expect(localStorage.getItem('mp_analytics_visitor_v1')).toBeNull();
});

it('provides a separate choice to stop all measurement', () => {
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole('button', { name: 'Desativar toda a medição' }));
  expect(localStorage.getItem(TRAFFIC_AGGREGATE)).toBe('disabled');
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe('denied');
});
