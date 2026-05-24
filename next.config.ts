import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');


const rootPath = process.cwd();
const nextConfig: NextConfig = {
  turbopack: {
    root: rootPath,
  },
  outputFileTracingRoot: rootPath,
  // Allow external images for app icons
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
