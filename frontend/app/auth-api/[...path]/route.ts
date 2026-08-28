import { appendSetCookieHeaders, buildAuthUpstreamUrl } from '@/lib/auth-proxy';

type RouteContext = {
  params: { path: string[] };
};

const REQUEST_HEADERS = [
  'accept',
  'authorization',
  'cookie',
  'content-type',
  'origin',
  'referer',
  'user-agent',
  'x-csrftoken',
  'x-session-token',
];

const RESPONSE_HEADERS = [
  'allow',
  'cache-control',
  'content-type',
  'location',
  'retry-after',
];

async function proxyAuthRequest(request: Request, { params }: RouteContext) {
  if (
    params.path.length < 3 ||
    !['app', 'browser'].includes(params.path[0]) ||
    params.path[1] !== 'v1'
  ) {
    return Response.json({ detail: 'Authentication route not found.' }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const upstreamUrl = buildAuthUpstreamUrl(params.path, requestUrl.search);
  const headers = new Headers();

  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('x-forwarded-host', requestUrl.host);
  headers.set('x-forwarded-proto', requestUrl.protocol.slice(0, -1));

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
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
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  appendSetCookieHeaders(responseHeaders, upstream.headers);
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
