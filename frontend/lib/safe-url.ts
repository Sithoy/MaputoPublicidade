/** URLs from uploads/API data must never become executable browser URLs. */
export function safeFileUrl(value: string | null | undefined): string | undefined {
  if (!value || /[\u0000-\u0020\\]/.test(value)) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
