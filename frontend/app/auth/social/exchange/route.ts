import {
  appendSetCookieHeaders,
  getCookieValue,
  resolveAuthBackendOrigin,
} from '@/lib/auth-proxy';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const cookie = request.headers.get('cookie');
  const csrfToken = getCookieValue(cookie, 'csrftoken');
  if (!cookie || !csrfToken) {
    return Response.json({ detail: 'Sessão social indisponível.' }, { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${resolveAuthBackendOrigin()}/api/auth/social/exchange/`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        cookie,
        origin: requestUrl.origin,
        referer: `${requestUrl.origin}/area-cliente/auth/callback`,
        'x-csrftoken': csrfToken,
        'x-forwarded-host': requestUrl.host,
        'x-forwarded-proto': requestUrl.protocol.slice(0, -1),
      },
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    return Response.json(
      { detail: 'Servidor de autenticação indisponível.' },
      { status: 503 }
    );
  }

  const responseHeaders = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': upstream.headers.get('content-type') || 'application/json',
  });
  appendSetCookieHeaders(responseHeaders, upstream.headers);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
