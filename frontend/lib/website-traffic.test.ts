import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { analyticsAllowed, publicTrafficPath, setAnalyticsConsent, trackWebsiteAction, trafficSource, TRAFFIC_CONSENT } from './website-traffic';

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  window.history.replaceState({}, '', '/orcamento?token=secret&utm_source=whatsapp');
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '0' });
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 204 }));
  let next = 0;
  vi.stubGlobal('crypto', { randomUUID: () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}` });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('public website tracking', () => {
  it('requires a new explicit opt-in, not the old cookie acceptance', () => {
    localStorage.setItem('mp_cookie_consent', 'accepted');
    trackWebsiteAction('page_view');
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.getItem('mp_analytics_visitor_v1')).toBeNull();
    setAnalyticsConsent(true);
    trackWebsiteAction('page_view');
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('sends only bounded public data, without URL queries or private identifiers', () => {
    setAnalyticsConsent(true);
    trackWebsiteAction('page_view');
    const call = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.path).toBe('/orcamento');
    expect(body.source).toBe('whatsapp');
    expect(call[1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(Object.keys(body).sort()).toEqual(['consent', 'device', 'event_id', 'kind', 'path', 'session_id', 'source', 'visitor_id']);
  });
  it.each(['/admin', '/area-cliente', '/arte/rever/token', '/proposta', '/acompanhar', '/?token=private', '/catalogo/x#private', 'https://example.com/'])('excludes private or arbitrary path %s', (path) => {
    expect(publicTrafficPath(path)).toBeNull();
    setAnalyticsConsent(true); trackWebsiteAction('page_view', path);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not collect private account activity but counts signup success against an existing public visit', () => {
    setAnalyticsConsent(true); trackWebsiteAction('page_view');
    window.history.replaceState({}, '', '/area-cliente/registo');
    trackWebsiteAction('page_view');
    expect(fetch).toHaveBeenCalledOnce();
    trackWebsiteAction('signup_completed');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string)).toMatchObject({ path: '/orcamento', kind: 'signup_completed' });
  });
  it('does not invent a public visit for a direct account registration', () => {
    setAnalyticsConsent(true); window.history.replaceState({}, '', '/area-cliente/registo');
    trackWebsiteAction('signup_completed'); expect(fetch).not.toHaveBeenCalled();
  });
  it('reuses a session and rotates it after 30 minutes without events', () => {
    setAnalyticsConsent(true); const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now);
    trackWebsiteAction('page_view'); trackWebsiteAction('quote_click');
    vi.mocked(Date.now).mockReturnValue(now + 1800001); trackWebsiteAction('page_view');
    const bodies = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(init!.body as string));
    expect(bodies[0].session_id).toBe(bodies[1].session_id);
    expect(bodies[2].session_id).not.toBe(bodies[1].session_id);
    expect(bodies[0].visitor_id).toBe(bodies[2].visitor_id);
  });
  it('withdraws consent and clears analytic identifiers', () => {
    setAnalyticsConsent(true); trackWebsiteAction('page_view');
    setAnalyticsConsent(false); trackWebsiteAction('page_view');
    expect(fetch).toHaveBeenCalledOnce();
    expect(localStorage.getItem(TRAFFIC_CONSENT)).toBe('denied');
    expect(localStorage.getItem('mp_analytics_visitor_v1')).toBeNull();
    expect(sessionStorage.getItem('mp_analytics_session_v1')).toBeNull();
  });
  it('honours browser privacy signals even with consent', () => {
    setAnalyticsConsent(true);
    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '1' });
    expect(analyticsAllowed()).toBe(false); trackWebsiteAction('page_view');
    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '0' });
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
    trackWebsiteAction('page_view'); expect(fetch).not.toHaveBeenCalled();
  });
  it('groups external referrers and does not preserve arbitrary UTM values', () => {
    expect(trafficSource('?utm_source=private@example.com', 'https://example.com/private')).toBe('referral');
    expect(trafficSource('', 'https://www.google.com/search?q=private')).toBe('google');
    expect(trafficSource('', 'https://l.facebook.com/private')).toBe('facebook');
  });
  it('does not interrupt the site if storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('blocked'); });
    expect(() => trackWebsiteAction('page_view')).not.toThrow(); expect(fetch).not.toHaveBeenCalled();
  });
});
