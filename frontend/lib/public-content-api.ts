const PUBLIC_API_ORIGIN = 'https://www.maputopublicidade.com';

export function getPublicContentApiUrl(path: `/${string}`) {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    return `${PUBLIC_API_ORIGIN}${path}`;
  }

  return path;
}
