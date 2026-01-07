/** @type {import('next').NextConfig} */
const nextConfig = {
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
        hostname: 'pv-ai.pv.market',
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
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
};

export default nextConfig;
