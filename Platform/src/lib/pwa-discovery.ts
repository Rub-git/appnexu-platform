import * as cheerio from 'cheerio';

export interface PwaAssetScanResult {
  title: string;
  description: string;
  themeColor: string;
  manifestHref: string | null;
  icons: string[];
}

interface WebsiteManifest {
  icons?: Array<{ src?: string }>;
}

const TARGET_FETCH_TIMEOUT_MS = 8000;
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

async function extractManifestIcons(manifestHref: string, baseUrl: string): Promise<string[]> {
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

    if (!manifestResponse.ok) return [];

    const manifest = (await manifestResponse.json()) as WebsiteManifest;
    if (!Array.isArray(manifest.icons)) return [];

    return manifest.icons
      .map((icon) => icon?.src)
      .filter((src): src is string => Boolean(src))
      .map((src) => resolveUrl(src, manifestUrl))
      .filter((src): src is string => src !== null && !isBlockedCandidate(src));
  } catch {
    return [];
  }
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

  const themeColor = $('meta[name="theme-color"]').attr('content')?.trim() || '#ffffff';
  const manifestHref = $('link[rel="manifest"]').attr('href') || null;

  const manifestIcons = manifestHref ? await extractManifestIcons(manifestHref, effectiveUrl) : [];
  const linkIcons = extractLinkIcons($, effectiveUrl);
  const logoIcons = extractHeaderLogos($, effectiveUrl);
  const socialImages = extractSocialImages($, effectiveUrl);

  const faviconFallback = resolveUrl('/favicon.ico', effectiveUrl);
  const orderedIcons: string[] = [];

  for (const icon of manifestIcons) addUnique(orderedIcons, icon);
  for (const icon of linkIcons) addUnique(orderedIcons, icon);
  for (const icon of logoIcons) addUnique(orderedIcons, icon);
  for (const icon of socialImages) addUnique(orderedIcons, icon);
  addUnique(orderedIcons, faviconFallback);

  return {
    title,
    description,
    themeColor,
    manifestHref,
    icons: orderedIcons,
  };
}