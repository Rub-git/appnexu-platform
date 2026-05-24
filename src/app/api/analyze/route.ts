import { analyzeSchema, formatZodErrors } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';
import { scanPwaAssets } from '@/lib/pwa-discovery';

function getAlternateHostUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
      return parsed.toString();
    }
    parsed.hostname = `www.${parsed.hostname}`;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isTlsAltNameMismatch(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message || '';
  const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
  return (
    msg.includes('ERR_TLS_CERT_ALTNAME_INVALID') ||
    msg.includes('altnames') ||
    cause?.code === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
    (cause?.message || '').includes('altnames')
  );
}

export async function POST(request: Request) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Rate limit: 10 analyses per user per 60s
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }
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
    let effectiveUrl = url;

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
      const alternateUrl = getAlternateHostUrl(url);
      if (response.status === 404 && alternateUrl && alternateUrl !== url) {
        try {
          const altResponse = await fetch(alternateUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Appnexu-Analyzer/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'es,en;q=0.9',
            },
            redirect: 'follow',
          });

          if (altResponse.ok) {
            response = altResponse;
            effectiveUrl = alternateUrl;
          } else if (altResponse.status === 404) {
            return apiError(
              'El sitio devolvió HTTP 404 en el dominio principal y en la variante con/sin www. Verifica que la home pública exista.',
              502,
              'UPSTREAM_404_BOTH_HOSTS',
            );
          }
        } catch (altError) {
          if (isTlsAltNameMismatch(altError)) {
            return apiError(
              'El subdominio www tiene un certificado SSL inválido para ese host. Configura el certificado para incluir la variante www o usa el dominio canónico.',
              502,
              'SSL_WWW_HOSTNAME_MISMATCH',
            );
          }
        }
      }

      if (!response.ok) {
        return apiError(`Target URL returned HTTP ${response.status}`, 502, 'UPSTREAM_ERROR');
      }
    }

    const scanned = await scanPwaAssets(effectiveUrl);

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    logger.info('analyze', 'URL analyzed', { userId: session.user.id, url, effectiveUrl });

    return apiSuccess({
      url: effectiveUrl,
      title: scanned.title,
      description: scanned.description,
      themeColor: scanned.themeColor,
      manifestHref: scanned.manifestHref,
      icons: scanned.icons,
    });
  } catch (error) {
    logger.error('analyze', 'Analysis failed', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to analyze URL', 500, 'INTERNAL_ERROR');
  }
}
