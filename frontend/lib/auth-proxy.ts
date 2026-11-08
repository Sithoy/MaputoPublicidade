import { resolveBackendOrigin } from './backend-origin';

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

export function resolveAuthBackendOrigin(
  env: AuthProxyEnvironment = process.env
): string {
  return resolveBackendOrigin(env);
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
