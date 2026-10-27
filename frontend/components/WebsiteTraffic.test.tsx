import { StrictMode } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { WebsiteTraffic } from './WebsiteTraffic';
import { disableAllMeasurement, setAnalyticsConsent, TRAFFIC_CHANGE } from '@/lib/website-traffic';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
beforeEach(() => {
  setAnalyticsConsent(false);
  pathname = '/'; localStorage.clear(); sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '0' });
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 204 }));
});
afterEach(() => vi.unstubAllGlobals());

it('records a page once under StrictMode, responds to consent and measures CTA clicks separately', () => {
  const view = render(<StrictMode><WebsiteTraffic /><a href="https://wa.me/258000000" onClick={(event) => event.preventDefault()}>WhatsApp</a></StrictMode>);
  expect(fetch).toHaveBeenCalledOnce();
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ mode: 'aggregate', kind: 'page_view', path: '/' });
  setAnalyticsConsent(true);
  window.dispatchEvent(new Event(TRAFFIC_CHANGE));
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string)).toMatchObject({ mode: 'optional', aggregate: false });
  fireEvent.click(view.getByText('WhatsApp'));
  expect(JSON.parse(vi.mocked(fetch).mock.calls[2][1]!.body as string)).toMatchObject({ kind: 'whatsapp_click', aggregate: true });
  pathname = '/catalogo'; view.rerender(<StrictMode><WebsiteTraffic /></StrictMode>);
  expect(fetch).toHaveBeenCalledTimes(4);
  pathname = '/area-cliente'; view.rerender(<StrictMode><WebsiteTraffic /></StrictMode>);
  expect(fetch).toHaveBeenCalledTimes(4);
});

it('never recounts the current page on consent withdrawal and regrant', () => {
  setAnalyticsConsent(true);
  render(<StrictMode><WebsiteTraffic /></StrictMode>);
  expect(fetch).toHaveBeenCalledOnce();
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toMatchObject({ mode: 'optional', aggregate: true });
  setAnalyticsConsent(false); setAnalyticsConsent(true);
  expect(fetch).toHaveBeenCalledOnce();
});

it('allows all measurement to be disabled without a temporary extra count', () => {
  disableAllMeasurement();
  render(<WebsiteTraffic />);
  expect(fetch).not.toHaveBeenCalled();
  setAnalyticsConsent(false);
  expect(fetch).toHaveBeenCalledOnce();
  disableAllMeasurement();
  expect(fetch).toHaveBeenCalledOnce();
});
