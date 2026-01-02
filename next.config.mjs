/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pvmarket.com',
      },
      {
        protocol: 'https',
        hostname: 'www.pvmarket.com',
      },
      {
        protocol: 'https',
        hostname: 'pv.market',
      },
      {
        protocol: 'https',
        hostname: 'www.pv.market',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: 'bs-local.com',
        port: '3000',
      },
    ],
  },
};

export default nextConfig;
