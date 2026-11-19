import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages are consumed as TypeScript source.
  transpilePackages: ['@gsc/shared', '@gsc/contracts'],
};

export default nextConfig;
