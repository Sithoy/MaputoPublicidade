const LOCAL_BACKEND_ORIGIN = 'http://backend:8000';
const PRODUCTION_BACKEND_ORIGIN =
  'https://maputo-publicidade-backend-4ppp.onrender.com';

type AuthProxyEnvironment = Record<string, string | undefined>;

// This is an application auth gateway, not an unrestricted allauth proxy.
const AUTH_ENDPOINTS: Record<string, { pathname: string; methods: readonly string[] }> = {
  'app/v1/config': { pathname: '/_allauth/app/v1/config', methods: ['GET', 'HEAD'] },
  'app/v1/auth/login': { pathname: '/_allauth/app/v1/auth/login', methods: ['POST'] },
  'app/v1/auth/signup': { pathname: '/_allauth/app/v1/auth/signup', methods: ['POST'] },
  'app/v1/auth/logout': { pathname: '/_allauth/app/v1/auth/logout', methods: ['POST'] },
  'app/v1/auth/session': { pathname: '/_allauth/app/v1/auth/session', methods: ['GET', 'HEAD', 'DELETE'] },
  'app/v1/tokens/refresh': { pathname: '/_allauth/app/v1/tokens/refresh', methods: ['POST'] },
};

export function authProxyEndpoint(path: string[]) {
  if (!Array.isArray(path) || path.some(segment => !/^[a-zA-Z0-9_-]{1,80}$/.test(segment))) return undefined;
  return Object.hasOwn(AUTH_ENDPOINTS, path.join('/')) ? AUTH_ENDPOINTS[path.join('/')] : undefined;
}

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
  const endpoint = authProxyEndpoint(path);
  if (!endpoint) {
    throw new Error('Invalid authentication route');
  }
  const origin = resolveAuthBackendOrigin(env);
  const url = new URL(origin);
  url.pathname = endpoint.pathname;
  url.search = new URLSearchParams(search).toString();
  if (url.origin !== origin) throw new Error('Invalid authentication origin');
  return url.toString();
}
