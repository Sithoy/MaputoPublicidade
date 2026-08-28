const LOCAL_BACKEND_ORIGIN = 'http://backend:8000';
const PRODUCTION_BACKEND_ORIGIN =
  'https://maputo-publicidade-backend-4ppp.onrender.com';

type AuthProxyEnvironment = Record<string, string | undefined>;

function normalizeOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string): boolean {
  const hostname = new URL(origin).hostname;
  return hostname === 'backend' || hostname === 'localhost' || hostname === '127.0.0.1';
}

export function resolveAuthBackendOrigin(
  env: AuthProxyEnvironment = process.env
): string {
  const configured =
    normalizeOrigin(env.INTERNAL_API_URL) || normalizeOrigin(env.NEXT_PUBLIC_BACKEND_URL);
  const isVercel = env.VERCEL === '1' || Boolean(env.VERCEL_ENV);

  if (configured && !(isVercel && isLocalOrigin(configured))) {
    return configured;
  }

  return isVercel ? PRODUCTION_BACKEND_ORIGIN : LOCAL_BACKEND_ORIGIN;
}

export function buildAuthUpstreamUrl(
  path: string[],
  search: string,
  env: AuthProxyEnvironment = process.env
): string {
  const safePath = path.map((segment) => encodeURIComponent(segment)).join('/');
  return `${resolveAuthBackendOrigin(env)}/_allauth/${safePath}${search}`;
}

export function buildAccountsUpstreamUrl(
  path: string[],
  search: string,
  env: AuthProxyEnvironment = process.env
): string {
  const safePath = path.map((segment) => encodeURIComponent(segment)).join('/');
  return `${resolveAuthBackendOrigin(env)}/accounts/${safePath}${search}`;
}

export function splitSetCookieHeaders(headers: Headers): string[] {
  const headersWithCookies = headers as Headers & { getSetCookie?: () => string[] };
  const values =
    typeof headersWithCookies.getSetCookie === 'function'
      ? headersWithCookies.getSetCookie()
      : [headers.get('set-cookie')].filter((value): value is string => Boolean(value));

  return values.flatMap((value) =>
    value.split(/,(?=\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=)/g)
  );
}

export function cookieHeaderFromSetCookie(setCookies: string[]): string {
  return setCookies.map((cookie) => cookie.split(';', 1)[0].trim()).join('; ');
}

export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(';')) {
    const [key, ...value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

export function appendSetCookieHeaders(target: Headers, source: Headers): void {
  for (const cookie of splitSetCookieHeaders(source)) {
    target.append('set-cookie', cookie);
  }
}
