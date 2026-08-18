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
