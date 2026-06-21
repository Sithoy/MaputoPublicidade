/** @type {import('next').NextConfig} */
const internalApiUrl = process.env.INTERNAL_API_URL || 'http://backend:8000';

const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
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
    ],
  },
  env: {
    INTERNAL_API_URL: internalApiUrl,
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
