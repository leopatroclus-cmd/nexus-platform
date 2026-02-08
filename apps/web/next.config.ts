import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nexus/types', '@nexus/utils'],
};

export default nextConfig;
