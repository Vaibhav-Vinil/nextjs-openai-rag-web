/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  devIndicators: false,
  images: {
    domains: [
      'pvmarket.com',
      'www.pvmarket.com',
      'pv.market',
      'www.pv.market',
      'storage.googleapis.com',
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
