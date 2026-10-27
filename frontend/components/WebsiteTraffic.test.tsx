import { StrictMode } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { WebsiteTraffic } from './WebsiteTraffic';
import { setAnalyticsConsent, TRAFFIC_CHANGE } from '@/lib/website-traffic';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
beforeEach(() => {
  pathname = '/'; localStorage.clear(); sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '0' });
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 204 }));
});
afterEach(() => vi.unstubAllGlobals());

it('records a page once under StrictMode, responds to consent and measures CTA clicks separately', () => {
  const view = render(<StrictMode><WebsiteTraffic /><a href="https://wa.me/258000000" onClick={(event) => event.preventDefault()}>WhatsApp</a></StrictMode>);
  expect(fetch).not.toHaveBeenCalled();
  setAnalyticsConsent(true);
  window.dispatchEvent(new Event(TRAFFIC_CHANGE));
  expect(fetch).toHaveBeenCalledOnce();
  fireEvent.click(view.getByText('WhatsApp'));
  expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string).kind).toBe('whatsapp_click');
  pathname = '/catalogo'; view.rerender(<StrictMode><WebsiteTraffic /></StrictMode>);
  expect(fetch).toHaveBeenCalledTimes(3);
  pathname = '/area-cliente'; view.rerender(<StrictMode><WebsiteTraffic /></StrictMode>);
  expect(fetch).toHaveBeenCalledTimes(3);
});
