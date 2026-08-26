/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const internalApiUrl =
  process.env.INTERNAL_API_URL ||
  (process.env.VERCEL === '1'
    ? 'https://maputo-publicidade-backend-4ppp.onrender.com'
    : 'http://backend:8000');

// Browser API calls are same-origin (rewrites proxy the backend), so
// connect-src 'self' is enough. Dev adds ws: for HMR and http://localhost
// for locally served media.
const contentSecurityPolicy = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  isDev
    ? "img-src 'self' data: blob: https: http://localhost:8000 http://127.0.0.1:8000"
    : "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  isDev ? "connect-src 'self' ws:" : "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    domains: ['localhost', 'backend'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'backend',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
        pathname: '/media/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*/`,
      },
      {
        source: '/_allauth/:path*',
        destination: `${internalApiUrl}/_allauth/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${internalApiUrl}/media/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
