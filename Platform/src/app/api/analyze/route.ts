import * as cheerio from 'cheerio';
import { analyzeSchema, formatZodErrors } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';

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
          'User-Agent': 'Appnexu-Analyzer/1.0',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return apiError('Request timeout — the target URL took too long to respond', 504, 'TIMEOUT');
      }
      return apiError('Failed to fetch the URL. Please check the URL is accessible.', 502, 'FETCH_FAILED');
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

    // Attempt to find icons
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

    const finalTitle = rawTitle.trim() || new URL(url).hostname;
    const finalDescription = rawDescription.trim() || `App generated for ${finalTitle}`;

    logger.info('analyze', 'URL analyzed', { userId: session.user.id, url });

    return apiSuccess({
      url,
      title: finalTitle,
      description: finalDescription,
      themeColor,
      icons: [...new Set(icons)],
    });
  } catch (error) {
    logger.error('analyze', 'Analysis failed', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to analyze URL', 500, 'INTERNAL_ERROR');
  }
}
