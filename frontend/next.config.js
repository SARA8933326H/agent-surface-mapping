/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@surface/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY || '',
  },
};

module.exports = nextConfig;
