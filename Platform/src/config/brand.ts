/**
 * Appnexu Brand Configuration
 * 
 * Centralized brand config for the entire platform.
 * White-label customers can override these values.
 * Import from this file instead of hardcoding brand strings.
 */

export const brand = {
  // ─── Identity ──────────────────────────────────────────────────────────────
  name: 'Appnexu',
  domain: 'appnexu.com',
  supportEmail: 'support@appnexu.com',
  copyright: `© ${new Date().getFullYear()} Appnexu. All rights reserved.`,

  // ─── Taglines ──────────────────────────────────────────────────────────────
  tagline: {
    en: 'From website to app. Instantly.',
    es: 'De sitio web a app, al instante.',
  },

  // ─── Logo Assets ───────────────────────────────────────────────────────────
  logo: {
    full: '/images/appnexu-logo.jpg',     // Full wordmark + icon
    favicon: '/favicon.ico',
    icon192: '/icons/icon-192.png',
    icon512: '/icons/icon-512.png',
    appleTouchIcon: '/icons/apple-touch-icon.png',
  },

  // ─── Color System ──────────────────────────────────────────────────────────
  colors: {
    primary: '#178BFF',
    primaryDark: '#5B2CCF',
    gradient: 'linear-gradient(to right, #178BFF, #5B2CCF)',
    gradientDiag: 'linear-gradient(135deg, #178BFF, #5B2CCF)',

    accent: {
      pink: '#F54291',
      orange: '#FF9F1C',
    },

    neutral: {
      900: '#0F172A',
      700: '#334155',
      500: '#64748B',
      200: '#E2E8F0',
      50: '#F8FAFC',
      white: '#FFFFFF',
    },
  },

  // ─── Gradients (Tailwind utility classes) ──────────────────────────────────
  gradients: {
    primary: 'bg-gradient-to-r from-[#178BFF] to-[#5B2CCF]',
    primaryDiag: 'bg-gradient-to-br from-[#178BFF] to-[#5B2CCF]',
    hero: 'bg-gradient-to-br from-[#178BFF] via-[#5B2CCF] to-[#F54291]',
    subtle: 'bg-gradient-to-r from-[#178BFF]/10 to-[#5B2CCF]/10',
  },

  // ─── Typography ────────────────────────────────────────────────────────────
  fonts: {
    heading: 'Sora',
    body: 'Inter',
  },

  // ─── Social / SEO ─────────────────────────────────────────────────────────
  seo: {
    defaultTitle: 'Appnexu - From website to app. Instantly.',
    defaultDescription:
      'Appnexu transforms your website into an installable mobile app with smart analysis, industry templates, and fast publishing.',
    keywords: [
      'website to app',
      'PWA generator',
      'mobile app builder',
      'Progressive Web App',
      'Appnexu',
      'convert website',
      'install app',
    ],
    ogImage: '/images/appnexu-logo.jpg',
    canonicalDomain: 'https://appnexu.com',
  },

  // ─── Plan Display Labels (internal → display) ─────────────────────────────
  planLabels: {
    FREE: { en: 'Starter', es: 'Starter' },
    PRO: { en: 'Pro', es: 'Pro' },
    AGENCY: { en: 'Agency', es: 'Agency' },
  } as Record<string, { en: string; es: string }>,

  // ─── UI Tokens ─────────────────────────────────────────────────────────────
  ui: {
    borderRadius: 'rounded-xl',
    borderRadiusLg: 'rounded-2xl',
    shadow: 'shadow-sm',
    shadowMd: 'shadow-md',
    shadowLg: 'shadow-lg',
  },
} as const;

// Export type for white-label override
export type BrandConfig = typeof brand;
