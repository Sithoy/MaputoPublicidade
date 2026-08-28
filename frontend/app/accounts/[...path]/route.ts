import {
  appendSetCookieHeaders,
  buildAccountsUpstreamUrl,
} from '@/lib/auth-proxy';

type RouteContext = {
  params: { path: string[] };
};

const REQUEST_HEADERS = ['accept', 'content-type', 'cookie', 'origin', 'referer', 'user-agent'];
const RESPONSE_HEADERS = ['cache-control', 'content-type', 'location'];

async function proxyProviderCallback(request: Request, { params }: RouteContext) {
  const requestUrl = new URL(request.url);
  const headers = new Headers();

  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('x-forwarded-host', requestUrl.host);
  headers.set('x-forwarded-proto', requestUrl.protocol.slice(0, -1));

  let upstream: Response;
  try {
    upstream = await fetch(
      buildAccountsUpstreamUrl(params.path, requestUrl.search),
      {
        method: request.method,
        headers,
        body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
        cache: 'no-store',
        redirect: 'manual',
      }
    );
  } catch {
    return Response.redirect(
      new URL('/area-cliente/auth/callback?error=provider_unavailable', request.url)
    );
  }

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  appendSetCookieHeaders(responseHeaders, upstream.headers);
  responseHeaders.set('Cache-Control', 'no-store');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyProviderCallback;
export const POST = proxyProviderCallback;
