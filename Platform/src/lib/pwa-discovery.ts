import * as cheerio from 'cheerio';

export interface PwaAssetScanResult {
  title: string;
  description: string;
  themeColor: string;
  manifestHref: string | null;
  icons: string[];
  manifestUrl: string | null;
  hasServiceWorker: boolean;
  serviceWorkerUrl: string | null;
  manifestStartUrl: string | null;
  manifestScope: string | null;
  has192Icon: boolean;
  has512Icon: boolean;
  isImportablePwa: boolean;
}

interface WebsiteManifest {
  start_url?: string;
  scope?: string;
  icons?: Array<{ src?: string }>;
}

const TARGET_FETCH_TIMEOUT_MS = 8000;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

/**
 * Normalize any CSS color string to a 6-digit hex value (#rrggbb).
 * Supports: #rgb, #rrggbb, rgb(), rgba(), hsl(), named colors.
 * Returns the fallback if conversion is not possible.
 */
function normalizeToHexColor(raw: string, fallback = '#178BFF'): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();

  // Already valid hex
  if (HEX_COLOR_RE.test(trimmed)) {
    // Expand 3-digit shorthand to 6-digit
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return trimmed.substring(0, 7); // strip alpha channel if 8-digit
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10)).toString(16).padStart(2, '0');
    const g = Math.min(255, parseInt(rgbMatch[2], 10)).toString(16).padStart(2, '0');
    const b = Math.min(255, parseInt(rgbMatch[3], 10)).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Named colors mapping (most common ones)
  const NAMED: Record<string, string> = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
    pink: '#ffc0cb', gray: '#808080', grey: '#808080', transparent: fallback,
  };
  const lower = trimmed.toLowerCase();
  if (NAMED[lower]) return NAMED[lower];

  return fallback;
}
const MANIFEST_FETCH_TIMEOUT_MS = 5000;

const BLOCKED_HOST_PATTERNS = [
  /(^|\.)replit\./i,
  /(^|\.)vercel\./i,
  /(^|\.)app\.replit\./i,
];

const BLOCKED_PATH_PATTERNS = [
  /replit/i,
  /vercel/i,
  /template/i,
  /starter/i,
  /boilerplate/i,
  /constructor/i,
  /generated/i,
  /placeholder/i,
  /nextjs/i,
  /vite/i,
  /sveltekit/i,
  /nuxt/i,
  /remix/i,
];

const LOGO_SELECTORS = [
  'header img',
  'nav img',
  '[role="banner"] img',
  '.logo img',
  '#logo img',
  'img[class*="logo"]',
  'img[id*="logo"]',
  'img[alt*="logo"]',
  'img[title*="logo"]',
];

function resolveUrl(rawUrl: string, baseUrl: string): string | null {
  try {
    return new URL(rawUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

function isBlockedCandidate(url: string, context = ''): boolean {
  let parsed: URL | null = null;

  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }

  const host = parsed?.hostname.toLowerCase() || '';
  const path = `${parsed?.pathname || ''}${parsed?.search || ''}`.toLowerCase();
  const text = context.toLowerCase();

  return (
    BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host)) ||
    BLOCKED_PATH_PATTERNS.some((pattern) => pattern.test(path)) ||
    BLOCKED_PATH_PATTERNS.some((pattern) => pattern.test(text))
  );
}

function addUnique(list: string[], value: string | null): void {
  if (!value) return;
  if (!list.includes(value)) list.push(value);
}

async function extractManifestData(
  manifestHref: string,
  baseUrl: string,
): Promise<{
  manifestUrl: string | null;
  icons: string[];
  startUrl: string | null;
  scope: string | null;
  has192Icon: boolean;
  has512Icon: boolean;
}> {
  try {
    const manifestUrl = new URL(manifestHref, baseUrl).toString();
    const manifestResponse = await fetch(manifestUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(MANIFEST_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Appnexu-Analyzer/1.0)',
        'Accept': 'application/manifest+json,application/json;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!manifestResponse.ok) {
      return {
        manifestUrl: null,
        icons: [],
        startUrl: null,
        scope: null,
        has192Icon: false,
        has512Icon: false,
      };
    }

    const manifest = (await manifestResponse.json()) as WebsiteManifest;
    if (!Array.isArray(manifest.icons)) {
      return {
        manifestUrl,
        icons: [],
        startUrl: manifest.start_url || null,
        scope: manifest.scope || null,
        has192Icon: false,
        has512Icon: false,
      };
    }

    const iconCandidates = manifest.icons
      .map((icon) => icon?.src)
      .filter((src): src is string => Boolean(src))
      .map((src) => resolveUrl(src, manifestUrl))
      .filter((src): src is string => src !== null && !isBlockedCandidate(src));

    const has192Icon = manifest.icons.some((icon) => (icon?.src || '').includes('192'));
    const has512Icon = manifest.icons.some((icon) => (icon?.src || '').includes('512'));

    return {
      manifestUrl,
      icons: iconCandidates,
      startUrl: manifest.start_url || null,
      scope: manifest.scope || null,
      has192Icon,
      has512Icon,
    };
  } catch {
    return {
      manifestUrl: null,
      icons: [],
      startUrl: null,
      scope: null,
      has192Icon: false,
      has512Icon: false,
    };
  }
}

async function detectServiceWorker(baseUrl: string): Promise<{ hasServiceWorker: boolean; serviceWorkerUrl: string | null }> {
  const swPathCandidates = ['/sw.js', '/service-worker.js'];

  for (const path of swPathCandidates) {
    try {
      const swUrl = new URL(path, baseUrl).toString();
      const response = await fetch(swUrl, {
        method: 'GET',
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(MANIFEST_FETCH_TIMEOUT_MS),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Appnexu-Analyzer/1.0)',
          'Accept': 'application/javascript,text/javascript,*/*;q=0.8',
        },
      });

      if (response.ok) {
        return {
          hasServiceWorker: true,
          serviceWorkerUrl: swUrl,
        };
      }
    } catch {
      // Ignore and continue with next candidate.
    }
  }

  return {
    hasServiceWorker: false,
    serviceWorkerUrl: null,
  };
}

function extractLinkIcons($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const icons: string[] = [];
  const selectors = [
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
  ];

  $(selectors.join(', ')).each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    const resolved = resolveUrl(href, baseUrl);
    if (!resolved || isBlockedCandidate(resolved)) return;
    addUnique(icons, resolved);
  });

  return icons;
}

function extractHeaderLogos($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const logos: string[] = [];

  $(LOGO_SELECTORS.join(', ')).each((_, el) => {
    const href = $(el).attr('src');
    if (!href) return;

    const context = [
      $(el).attr('alt') || '',
      $(el).attr('title') || '',
      $(el).attr('class') || '',
      $(el).attr('id') || '',
    ].join(' ');

    const resolved = resolveUrl(href, baseUrl);
    if (!resolved || isBlockedCandidate(resolved, context)) return;
    addUnique(logos, resolved);
  });

  return logos;
}

function extractSocialImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const images: string[] = [];

  $('meta[property="og:image"], meta[name="og:image"], meta[property="twitter:image"], meta[name="twitter:image"]').each((_, el) => {
    const content = $(el).attr('content');
    if (!content) return;

    const resolved = resolveUrl(content, baseUrl);
    if (!resolved || isBlockedCandidate(resolved)) return;
    addUnique(images, resolved);
  });

  return images;
}

export async function scanPwaAssets(targetUrl: string): Promise<PwaAssetScanResult> {
  const response = await fetch(targetUrl, {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(TARGET_FETCH_TIMEOUT_MS),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Appnexu-Analyzer/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Target URL returned HTTP ${response.status}`);
  }

  const effectiveUrl = response.url || targetUrl;
  const html = await response.text();
  const $ = cheerio.load(html);

  const title =
    $('title').text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    new URL(effectiveUrl).hostname;

  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    `App generated for ${title}`;

  const themeColor = normalizeToHexColor(
    $('meta[name="theme-color"]').attr('content')?.trim() || '',
  );
  const manifestHref = $('link[rel="manifest"]').attr('href') || null;

  const manifestData = manifestHref
    ? await extractManifestData(manifestHref, effectiveUrl)
    : {
      manifestUrl: null,
      icons: [],
      startUrl: null,
      scope: null,
      has192Icon: false,
      has512Icon: false,
    };
  const swData = await detectServiceWorker(effectiveUrl);
  const linkIcons = extractLinkIcons($, effectiveUrl);
  const logoIcons = extractHeaderLogos($, effectiveUrl);
  const socialImages = extractSocialImages($, effectiveUrl);

  const faviconFallback = resolveUrl('/favicon.ico', effectiveUrl);
  const orderedIcons: string[] = [];

  for (const icon of manifestData.icons) addUnique(orderedIcons, icon);
  for (const icon of linkIcons) addUnique(orderedIcons, icon);
  for (const icon of logoIcons) addUnique(orderedIcons, icon);
  for (const icon of socialImages) addUnique(orderedIcons, icon);
  addUnique(orderedIcons, faviconFallback);

  const isImportablePwa =
    Boolean(manifestData.manifestUrl) &&
    swData.hasServiceWorker &&
    manifestData.has192Icon &&
    manifestData.has512Icon;

  return {
    title,
    description,
    themeColor,
    manifestHref,
    icons: orderedIcons,
    manifestUrl: manifestData.manifestUrl,
    hasServiceWorker: swData.hasServiceWorker,
    serviceWorkerUrl: swData.serviceWorkerUrl,
    manifestStartUrl: manifestData.startUrl,
    manifestScope: manifestData.scope,
    has192Icon: manifestData.has192Icon,
    has512Icon: manifestData.has512Icon,
    isImportablePwa,
  };
}