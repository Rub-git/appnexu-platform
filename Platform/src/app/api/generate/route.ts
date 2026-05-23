import { prisma, withRetry } from '@/lib/prisma';
import { auth, canCreateApp } from '@/lib/auth';
import { generateSchema, formatZodErrors } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { trackBillingUsage } from '@/lib/billing-usage';
import { invalidateAppProjectCaches } from '@/lib/app-project-cache';
import { getVisualPresetBySlug } from '@/lib/visual-presets';

function buildDefaultIconUrls(targetUrl: string): string {
  try {
    const origin = new URL(targetUrl).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return '';
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Rate limit: 5 generates per user per 60s
    const rl = checkRateLimit(`generate:${session.user.id}`, { max: 5, windowSec: 60 });
    if (!rl.allowed) {
      logger.warn('generate', 'Rate limited', { userId: session.user.id });
      return apiError('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', formatZodErrors(parsed.error));
    }

    const data = parsed.data;
    const providedIconUrls = data.iconUrls?.trim() || '';
    const initialIconUrls = providedIconUrls || buildDefaultIconUrls(data.url);

    // Check plan limits (with retry for transient DB errors)
    const limitCheck = await withRetry(() => canCreateApp(session.user!.id));
    if (!limitCheck.allowed) {
      logger.info('generate', 'Plan limit reached', { userId: session.user.id, current: limitCheck.current, limit: limitCheck.limit });
      return apiError('Plan limit reached. Please upgrade your plan to create more apps.', 403, 'PLAN_LIMIT_REACHED');
    }

    // ── Visual preset application (lightweight styling only) ───────
    const requestedPresetSlug = data.visualPresetSlug || null;
    const visualPreset = getVisualPresetBySlug(requestedPresetSlug);

    // Extract short name from title, max 12 chars
    const shortName = data.title
      ? (data.title.split(' ')[0] || data.title).substring(0, 12)
      : 'App';

    // Merge visual preset colors if present
    const colorScheme = visualPreset?.colors;

    // Create app project with retry for transient DB errors
    const appProject = await withRetry(() =>
      prisma.appProject.create({
        data: {
          targetUrl: data.url,
          appName: data.title || 'My App',
          shortName,
          themeColor: data.themeColor || colorScheme?.primary || '#178BFF',
          backgroundColor: data.backgroundColor || colorScheme?.background || '#ffffff',
          iconUrls: initialIconUrls,
          userId: session.user!.id,
          visualPresetSlug: visualPreset?.slug || null,
        },
      })
    );

    logger.info('generate', 'App created', {
      userId: session.user.id,
      appId: appProject.id,
      slug: appProject.slug,
      visualPresetSlug: visualPreset?.slug || null,
    });

    await trackBillingUsage({
      userId: session.user.id,
      appId: appProject.id,
      metricKey: 'apps_created',
      metadata: {
        slug: appProject.slug,
        visualPresetSlug: visualPreset?.slug || null,
      },
    });

    await invalidateAppProjectCaches(session.user.id);

    return apiSuccess({
      id: appProject.id,
      slug: appProject.slug,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown';
    logger.error('generate', 'App creation failed', { error: message });

    if (message.includes("Can't reach database") || message.includes('connect') || message.includes('ECONNREFUSED')) {
      return apiError('No se pudo conectar a la base de datos. Inténtalo de nuevo.', 503, 'DATABASE_UNAVAILABLE');
    }

    if (message.includes('prisma') || message.includes('Prisma') || message.includes('Unique constraint')) {
      return apiError('Error de base de datos. Por favor, inténtalo de nuevo.', 500, 'DATABASE_ERROR');
    }

    return apiError('Error al crear la app. Inténtalo de nuevo.', 500, 'INTERNAL_ERROR');
  }
}
