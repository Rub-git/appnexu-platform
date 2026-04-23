import * as cheerio from 'cheerio';
import { analyzeSchema, formatZodErrors } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';

interface WebsiteManifestIcon {
  src?: string;
}

interface WebsiteManifest {
  icons?: WebsiteManifestIcon[];
}

async function extractManifestIcons(targetUrl: string, $: cheerio.CheerioAPI): Promise<string[]> {
  const manifestHref = $('link[rel="manifest"]').attr('href');
  if (!manifestHref) return [];

  try {
    const manifestUrl = new URL(manifestHref, targetUrl).toString();
    const manifestRes = await fetch(manifestUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Appnexu-Analyzer/1.0)',
        'Accept': 'application/manifest+json,application/json;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!manifestRes.ok) return [];

    const manifest = (await manifestRes.json()) as WebsiteManifest;
    if (!Array.isArray(manifest.icons)) return [];

    return manifest.icons
      .map((icon) => icon?.src)
      .filter((src): src is string => Boolean(src))
      .map((src) => {
        try {
          return new URL(src, manifestUrl).toString();
        } catch {
          return '';
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Rate limit: 10 analyses per user per 60s
    const rl = checkRateLimit(`analyze:${session.user.id}`, { max: 10, windowSec: 60 });
    if (!rl.allowed) {
      logger.warn('analyze', 'Rate limited', { userId: session.user.id });
      return apiError('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', formatZodErrors(parsed.error));
    }

    const { url } = parsed.data;

    // AbortController for timeout (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Appnexu-Analyzer/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es,en;q=0.9',
        },
        redirect: 'follow',
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return apiError('El sitio web tardó demasiado en responder. Verifica que la URL sea accesible.', 504, 'TIMEOUT');
      }
      const fetchMsg = fetchError instanceof Error ? fetchError.message : '';
      if (fetchMsg.includes('ENOTFOUND') || fetchMsg.includes('getaddrinfo')) {
        return apiError('No se encontró el dominio. Verifica que la URL sea correcta.', 502, 'DOMAIN_NOT_FOUND');
      }
      if (fetchMsg.includes('ECONNREFUSED')) {
        return apiError('No se pudo conectar al sitio web. Verifica que esté activo.', 502, 'CONNECTION_REFUSED');
      }
      if (fetchMsg.includes('certificate') || fetchMsg.includes('SSL') || fetchMsg.includes('TLS')) {
        return apiError('Error de certificado SSL en el sitio web.', 502, 'SSL_ERROR');
      }
      return apiError('No se pudo acceder a la URL. Verifica que el sitio web sea accesible.', 502, 'FETCH_FAILED');
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      return apiError(`Target URL returned HTTP ${response.status}`, 502, 'UPSTREAM_ERROR');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Metadata
    const rawTitle = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const rawDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const themeColor = $('meta[name="theme-color"]').attr('content') || '#ffffff';

    // Attempt to find icons in link tags
    const icons: string[] = [];
    $('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="shortcut icon"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const resolvedUrl = new URL(href, url).href;
          icons.push(resolvedUrl);
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    // Extract icons from target manifest when available.
    const manifestIcons = await extractManifestIcons(url, $);

    // Always include favicon fallback from target domain.
    let faviconFallback = '';
    try {
      faviconFallback = new URL('/favicon.ico', url).toString();
    } catch {
      faviconFallback = '';
    }

    const finalTitle = rawTitle.trim() || new URL(url).hostname;
    const finalDescription = rawDescription.trim() || `App generated for ${finalTitle}`;

    logger.info('analyze', 'URL analyzed', { userId: session.user.id, url });

    return apiSuccess({
      url,
      title: finalTitle,
      description: finalDescription,
      themeColor,
      icons: [...new Set([...icons, ...manifestIcons, ...(faviconFallback ? [faviconFallback] : [])])],
    });
  } catch (error) {
    logger.error('analyze', 'Analysis failed', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to analyze URL', 500, 'INTERNAL_ERROR');
  }
}
