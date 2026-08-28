import {
  appendSetCookieHeaders,
  buildAuthUpstreamUrl,
  cookieHeaderFromSetCookie,
  getCookieValue,
  splitSetCookieHeaders,
} from '@/lib/auth-proxy';

type RouteContext = {
  params: { provider: string };
};

type AuthConfig = {
  data?: {
    socialaccount?: {
      providers?: Array<{ id: string }>;
    };
  };
};

const ALLOWED_PROVIDERS = new Set(['google', 'microsoft']);

function loginErrorUrl(request: Request, error: string) {
  return new URL(`/area-cliente/login?social_error=${error}`, request.url);
}

export async function GET(request: Request, { params }: RouteContext) {
  const provider = params.provider.toLowerCase();
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return Response.redirect(loginErrorUrl(request, 'unknown_provider'));
  }

  const requestUrl = new URL(request.url);
  const frontendOrigin = requestUrl.origin;
  const forwardedHeaders = new Headers({
    accept: 'application/json',
    'x-forwarded-host': requestUrl.host,
    'x-forwarded-proto': requestUrl.protocol.slice(0, -1),
  });

  try {
    const configResponse = await fetch(buildAuthUpstreamUrl(['browser', 'v1', 'config'], ''), {
      headers: forwardedHeaders,
      cache: 'no-store',
      redirect: 'manual',
    });
    const config = (await configResponse.json()) as AuthConfig;
    const providers = config.data?.socialaccount?.providers || [];
    if (!providers.some((item) => item.id === provider)) {
      return Response.redirect(loginErrorUrl(request, 'provider_unavailable'));
    }

    const initialSetCookies = splitSetCookieHeaders(configResponse.headers);
    const cookieHeader = cookieHeaderFromSetCookie(initialSetCookies);
    const csrfToken = getCookieValue(cookieHeader, 'csrftoken');
    if (!csrfToken) {
      return Response.redirect(loginErrorUrl(request, 'provider_unavailable'));
    }

    const form = new URLSearchParams({
      provider,
      process: 'login',
      callback_url: `${frontendOrigin}/area-cliente/auth/callback`,
      csrfmiddlewaretoken: csrfToken,
    });
    const redirectResponse = await fetch(
      buildAuthUpstreamUrl(['browser', 'v1', 'auth', 'provider', 'redirect'], ''),
      {
        method: 'POST',
        headers: {
          ...Object.fromEntries(forwardedHeaders.entries()),
          'content-type': 'application/x-www-form-urlencoded',
          cookie: cookieHeader,
          origin: frontendOrigin,
          referer: `${frontendOrigin}/area-cliente/login`,
          'x-csrftoken': csrfToken,
        },
        body: form,
        cache: 'no-store',
        redirect: 'manual',
      }
    );

    const location = redirectResponse.headers.get('location');
    if (!location || redirectResponse.status < 300 || redirectResponse.status >= 400) {
      return Response.redirect(loginErrorUrl(request, 'provider_unavailable'));
    }

    const response = Response.redirect(location);
    for (const cookie of initialSetCookies) response.headers.append('set-cookie', cookie);
    appendSetCookieHeaders(response.headers, redirectResponse.headers);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return Response.redirect(loginErrorUrl(request, 'provider_unavailable'));
  }
}
