import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The dev-only indicator defaults to bottom-left, where it covers the sidebar collapse toggle and
  // intercepts clicks in browser tests. Not present in production builds.
  devIndicators: { position: 'bottom-right' },
  // Lets the live Playwright suite run its own dev server without sharing `.next` with a normal one.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Workspace packages are consumed as TypeScript source.
  transpilePackages: ['@gsc/shared', '@gsc/contracts'],
};

export default nextConfig;
