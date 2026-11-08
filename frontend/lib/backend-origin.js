// Shared by Next rewrites, server API calls and the authentication gateway.
const PRODUCTION_HOSTS = new Set([
  'maputopublicidade.com',
  'www.maputopublicidade.com',
  'mp-backend-production-654913531299.us-east4.run.app',
  'mp-backend-production-li3tt3hwvq-uk.a.run.app',
]);

/** @param {Record<string, string | undefined>} env */
function resolveBackendOrigin(env = process.env) {
  const hosted = env.VERCEL === '1' || Boolean(env.VERCEL_ENV);
  const production = env.VERCEL_ENV === 'production';
  const configured = env.INTERNAL_API_URL || env.NEXT_PUBLIC_BACKEND_URL;
  if (!configured && hosted) throw new Error('INTERNAL_API_URL must be configured for this environment');
  let url;
  try {
    url = new URL(configured || 'http://localhost:8000');
  } catch {
    throw new Error('Invalid backend origin');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/') throw new Error('Invalid backend origin');
  if (url.hostname.endsWith('.onrender.com')) throw new Error('Retired Render backend is not permitted');
  if (!production && (PRODUCTION_HOSTS.has(url.hostname) ||
      url.hostname.endsWith('---mp-backend-production-li3tt3hwvq-uk.a.run.app'))) {
    throw new Error('Nonproduction must not use the production backend');
  }
  if (hosted && (url.protocol !== 'https:' ||
      ['backend', 'localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('Hosted environments require an HTTPS backend');
  }
  return url.origin;
}

module.exports = { resolveBackendOrigin };
