const ZOHO_AUTHORIZATION_ENDPOINT = 'https://accounts.zoho.com/oauth/v2/auth';

/** The backend supplies OAuth parameters, never the navigation destination. */
export function zohoAuthorizationUrl(value: unknown): string {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) throw new Error('Invalid OAuth destination');
  const supplied = new URL(value);
  if (supplied.origin !== 'https://accounts.zoho.com' || supplied.pathname !== '/oauth/v2/auth' ||
      supplied.username || supplied.password || supplied.hash) throw new Error('Invalid OAuth destination');
  const destination = new URL(ZOHO_AUTHORIZATION_ENDPOINT);
  destination.search = supplied.search;
  return destination.href;
}
