import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const rootPath = process.cwd();
/** @type {import('next').NextConfig} */
const nextConfig = {
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
