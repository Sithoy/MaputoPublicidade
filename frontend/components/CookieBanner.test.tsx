import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CookieBanner } from './CookieBanner';
import { Footer } from './Footer';
import { aggregateAllowed, analyticsAllowed, setAnalyticsConsent, TRAFFIC_AGGREGATE, TRAFFIC_CONSENT } from '@/lib/website-traffic';

beforeEach(() => { setAnalyticsConsent(false); localStorage.clear(); sessionStorage.clear(); });
afterEach(() => vi.restoreAllMocks());

it('offers familiar choices without enabling detailed analytics, even after an old acceptance', () => {
  localStorage.setItem('mp_cookie_consent', 'accepted');
  render(<CookieBanner />);
  expect(screen.getByRole('button', { name: /^Aceitar$/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /^Rejeitar$/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Personalizar' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Saiba mais' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(analyticsAllowed()).toBe(false);
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Saiba mais' }));
  expect(screen.getByRole('link', { name: 'Política de Cookies' })).toHaveAttribute('href', '/politica-cookies');
});

it('accepts optional analytics with one click', () => {
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole('button', { name: /^Aceitar$/ }));
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe('granted');
  expect(localStorage.getItem(TRAFFIC_AGGREGATE)).toBe('enabled');
  expect(screen.queryByRole('heading', { name: 'Cookies e privacidade' })).not.toBeInTheDocument();
});

it('allows an existing analytics consent to be withdrawn', () => {
  localStorage.setItem(TRAFFIC_CONSENT, 'granted');
  localStorage.setItem(TRAFFIC_AGGREGATE, 'enabled');
  localStorage.setItem('mp_analytics_visitor_v1', 'fixture');
  sessionStorage.setItem('mp_analytics_session_v1', 'fixture');
  render(<><Footer /><CookieBanner /></>);
  fireEvent.click(screen.getByRole('button', { name: 'Preferências de privacidade' }));
  fireEvent.click(screen.getByRole('button', { name: /^Rejeitar$/ }));
  expect(localStorage.getItem('mp_analytics_visitor_v1')).toBeNull();
  expect(sessionStorage.getItem('mp_analytics_session_v1')).toBeNull();
  expect(aggregateAllowed()).toBe(false);
  expect(analyticsAllowed()).toBe(false);
});

it('rejects all measurement with one click', () => {
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole('button', { name: /^Rejeitar$/ }));
  expect(localStorage.getItem(TRAFFIC_AGGREGATE)).toBe('disabled');
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe('denied');
});

it.each([
  ['Permitir todas', 'granted', 'enabled'],
  ['Só estatísticas anónimas', 'denied', 'enabled'],
  ['Não permitir estatísticas', 'denied', 'disabled'],
])('saves the personalized choice %s only after confirmation', (label, consent, aggregate) => {
  render(<CookieBanner />);
  fireEvent.click(screen.getByRole('button', { name: 'Saiba mais' }));
  expect(screen.getByRole('button', { name: 'Saiba mais' })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(label) }));
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar preferências' }));
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe(consent);
  expect(localStorage.getItem(TRAFFIC_AGGREGATE)).toBe(aggregate);
});

it('keeps saved choices on later visits and opens them directly from the footer', () => {
  setAnalyticsConsent(false);
  render(<><Footer /><CookieBanner /></>);
  expect(screen.queryByRole('heading', { name: 'Cookies e privacidade' })).not.toBeInTheDocument();
  const footer = screen.getByRole('contentinfo');
  const preferences = within(footer).getByRole('button', { name: 'Preferências de privacidade' });
  expect(screen.getAllByRole('button', { name: 'Preferências de privacidade' })).toHaveLength(1);
  expect(within(footer).getByRole('link', { name: 'Cookies' }).parentElement).toBe(preferences.parentElement);
  expect(preferences).toHaveClass('text-gray-300');
  fireEvent.click(preferences);
  expect(screen.getByRole('radio', { name: /Só estatísticas anónimas/ })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: /Permitir todas/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Saiba mais' }));
  expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe('denied');
});

it('still presents the choices when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<CookieBanner />);
  expect(screen.getByRole('button', { name: /^Rejeitar$/ })).toBeVisible();
  expect(analyticsAllowed()).toBe(false);
});
