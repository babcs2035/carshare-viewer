import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/carshare-viewer',
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ["ktak.dev"],
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
