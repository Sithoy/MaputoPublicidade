import { authProxyEndpoint, buildAuthUpstreamUrl } from '@/lib/auth-proxy';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const REQUEST_HEADERS = [
  'accept',
  'authorization',
  'content-type',
  'user-agent',
  'x-csrftoken',
  'x-session-token',
];

const RESPONSE_HEADERS = [
  'allow',
  'cache-control',
  'content-type',
  'retry-after',
  'set-cookie',
];

async function proxyAuthRequest(request: Request, { params: pendingParams }: RouteContext) {
  const params = await pendingParams;
  const endpoint = authProxyEndpoint(params.path);
  if (!endpoint) {
    return Response.json({ detail: 'Authentication route not found.' }, { status: 404 });
  }
  if (!endpoint.methods.includes(request.method)) {
    return Response.json({ detail: 'Method not allowed.' }, {
      status: 405, headers: { Allow: endpoint.methods.join(', '), 'Cache-Control': 'no-store' },
    });
  }
  // App/JWT requests carry data in JSON, never in redirect/query parameters.
  // Do not feed any part of the incoming request URL into the upstream URL.
  const headers = new Headers();

  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response;
  try {
    const upstreamUrl = buildAuthUpstreamUrl(params.path, '');
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error('Authentication backend request failed', {
      path: params.path.join('/'),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return Response.json(
      { detail: 'Authentication backend unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const responseHeaders = new Headers();
  // This app/JWT proxy serves JSON, not browser OAuth navigation. Never relay
  // an unexpected upstream redirect to the caller's authenticated fetch.
  if (upstream.status >= 300 && upstream.status < 400) {
    return Response.json({ detail: 'Unexpected authentication redirect.' }, {
      status: 502, headers: { 'Cache-Control': 'no-store' },
    });
  }
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set('Cache-Control', 'no-store');

  if (upstream.status === 404) {
    console.error('Authentication backend route returned 404', {
      path: params.path.join('/'),
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyAuthRequest;
export const POST = proxyAuthRequest;
export const PUT = proxyAuthRequest;
export const PATCH = proxyAuthRequest;
export const DELETE = proxyAuthRequest;
export const HEAD = proxyAuthRequest;
