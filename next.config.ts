import type { NextConfig } from 'next';

const normalizeOriginHost = (value: string): string =>
  value.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();

const getApiUrlHost = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return '';

  try {
    return new URL(apiUrl).host;
  } catch {
    return normalizeOriginHost(apiUrl);
  }
};

const allowedOrigins = Array.from(
  new Set(
    [
      'localhost:3200',
      '127.0.0.1:3200',
      getApiUrlHost(),
      ...(process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((origin) => normalizeOriginHost(origin))
        .filter(Boolean),
    ].filter(Boolean),
  ),
);

const nextConfig: NextConfig = {
  basePath: '/carshare-viewer',
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'share.timescar.jp',
        port: '',
        pathname: '/station_photo/**',
      },
    ],
  },
};

export default nextConfig;
