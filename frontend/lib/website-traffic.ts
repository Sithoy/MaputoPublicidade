/** Separate anonymous counters from opt-in visitor/session analytics. */
export const TRAFFIC_CONSENT = 'mp_analytics_consent_v1';
export const TRAFFIC_AGGREGATE = 'mp_analytics_aggregate_v1';
export const TRAFFIC_CHANGE = 'mp-analytics-change';
const VISITOR = 'mp_analytics_visitor_v1';
const SESSION = 'mp_analytics_session_v1';
let pageOptOut = false;
const SOURCES = ['direct', 'google', 'bing', 'facebook', 'instagram', 'whatsapp', 'linkedin', 'referral'];
export type TrafficAction = 'page_view' | 'whatsapp_click' | 'quote_click' | 'signup_click' | 'quote_submitted' | 'signup_completed';
export function publicTrafficPath(path: string) {
  return /^\/(?:|sobre|contactos|servicos(?:\/[a-z0-9-]{1,120})?|catalogo(?:\/[a-z0-9-]{1,120})?|portfolio(?:\/[a-z0-9-]{1,120})?|orcamento|carrinho(?:\/checkout)?|termos|privacidade|politica-cookies)$/.test(path) ? path : null;
}
export function analyticsAllowed() {
  try {
    return localStorage.getItem(TRAFFIC_CONSENT) === 'granted' && navigator.doNotTrack !== '1' && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  } catch { return false; }
}
export function aggregateAllowed() {
  if (pageOptOut || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return false;
  try {
    const preference = localStorage.getItem(TRAFFIC_AGGREGATE);
    // Honour a refusal made before separate aggregate preferences existed.
    return preference !== 'disabled' && !(preference === null && localStorage.getItem(TRAFFIC_CONSENT) === 'denied');
  } catch { return true; } // Stateless counts can work when browser storage is unavailable.
}
function setPreferences(optional: boolean, aggregate: boolean) {
  pageOptOut = !aggregate;
  try {
    localStorage.setItem(TRAFFIC_CONSENT, optional ? 'granted' : 'denied');
    localStorage.setItem(TRAFFIC_AGGREGATE, aggregate ? 'enabled' : 'disabled');
    if (!optional) { localStorage.removeItem(VISITOR); sessionStorage.removeItem(SESSION); }
  } catch { /* Identified/session analytics remain disabled if storage is unavailable. */ }
  window.dispatchEvent(new Event(TRAFFIC_CHANGE));
}
export function setAnalyticsConsent(granted: boolean) { setPreferences(granted, true); }
export function disableAllMeasurement() { setPreferences(false, false); }
export function trafficSource(search: string, referrer: string) {
  const tagged = new URLSearchParams(search).get('utm_source')?.toLowerCase();
  if (tagged && SOURCES.includes(tagged) && tagged !== 'direct') return tagged;
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (['www.maputopublicidade.com', 'maputopublicidade.com', window.location.hostname].includes(host)) return 'direct';
    if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'google';
    const providers: Record<string, string> = { 'bing.com': 'bing', 'facebook.com': 'facebook', 'fb.com': 'facebook', 'instagram.com': 'instagram', 'whatsapp.com': 'whatsapp', 'wa.me': 'whatsapp', 'linkedin.com': 'linkedin' };
    return Object.entries(providers).find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] || 'referral';
  } catch { return 'direct'; }
}
type Session = { id: string; expires: number; source: string; path: string };
function send(body: object) {
  void fetch('/api/website-traffic/events/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', keepalive: true, referrerPolicy: 'no-referrer',
    body: JSON.stringify(body),
  }).catch(() => { /* Measurement must never interrupt a client action. No automatic retries. */ });
}
export function trackWebsiteAction(kind: TrafficAction, suppliedPath?: string, detailOnly = false): 'none' | 'aggregate' | 'optional' {
  if (!aggregateAllowed() || (process.env.NODE_ENV === 'production' && !['www.maputopublicidade.com', 'maputopublicidade.com'].includes(location.hostname))) return 'none';
  const path = publicTrafficPath(suppliedPath || location.pathname);
  function basic(): 'none' | 'aggregate' {
    if (!path || kind === 'signup_completed' || detailOnly) return 'none';
    send({ mode: 'aggregate', kind, path });
    return 'aggregate';
  }
  try {
    if (!analyticsAllowed()) return basic();
    const now = Date.now();
    let session: Session | null = JSON.parse(sessionStorage.getItem(SESSION) || 'null');
    // Registration is the only portal boundary measured: count success against the prior public visit, never the account URL or identity.
    const eventPath = path || (kind === 'signup_completed' && session && session.expires > now ? publicTrafficPath(session.path) : null);
    if (!eventPath) return 'none';
    let visitor: { id: string; expires: number } | null = JSON.parse(localStorage.getItem(VISITOR) || 'null');
    if (!visitor || visitor.expires <= now) { visitor = { id: crypto.randomUUID(), expires: now + 30 * 86400000 }; localStorage.setItem(VISITOR, JSON.stringify(visitor)); }
    if (!session || session.expires <= now) session = { id: crypto.randomUUID(), expires: now + 1800000, source: trafficSource(location.search, document.referrer), path: eventPath };
    session.expires = now + 1800000; session.path = eventPath;
    sessionStorage.setItem(SESSION, JSON.stringify(session));
    send({ mode: 'optional', aggregate: !detailOnly, event_id: crypto.randomUUID(), visitor_id: visitor.id, session_id: session.id, kind, path: eventPath, source: session.source, device: innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop', consent: true });
    return 'optional';
  } catch {
    try { return basic(); } catch { return 'none'; }
  }
}
