/** Never attach an MP bearer token to an API-provided external URL. */
export function authenticatedApiPath(path: string): string {
  if (!path.startsWith('/api/') || /[\u0000-\u0020\\]/.test(path)) {
    throw new Error('Invalid authenticated API path');
  }
  const url = new URL(path, 'https://authenticated-api.invalid');
  if (url.origin !== 'https://authenticated-api.invalid' || !url.pathname.startsWith('/api/') || url.hash) {
    throw new Error('Invalid authenticated API path');
  }
  return url.pathname + url.search;
}
