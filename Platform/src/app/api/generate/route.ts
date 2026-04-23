import { prisma, withRetry } from '@/lib/prisma';
import { auth, canCreateApp } from '@/lib/auth';
import { generateSchema, formatZodErrors } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { getUserPlan, canUsePremiumTemplate } from '@/lib/plan-gates';

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

    // Check plan limits (with retry for transient DB errors)
    const limitCheck = await withRetry(() => canCreateApp(session.user!.id));
    if (!limitCheck.allowed) {
      logger.info('generate', 'Plan limit reached', { userId: session.user.id, current: limitCheck.current, limit: limitCheck.limit });
      return apiError('Plan limit reached. Please upgrade your plan to create more apps.', 403, 'PLAN_LIMIT_REACHED');
    }

    // ── Template application (server-side validation) ──────────────
    let templateConfig: Record<string, unknown> | null = null;
    let templateId: string | null = null;

    if (data.templateSlug) {
      const template = await withRetry(() =>
        prisma.appTemplate.findUnique({
          where: { slug: data.templateSlug! },
        })
      );

      if (!template) {
        return apiError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
      }

      // SERVER-SIDE premium gate
      if (template.isPremium) {
        const plan = await getUserPlan(session.user.id);
        if (!canUsePremiumTemplate(plan)) {
          return apiError(
            'Premium templates require a PRO or AGENCY plan. Please upgrade.',
            403,
            'PREMIUM_TEMPLATE_RESTRICTED',
          );
        }
      }

      templateConfig = template.configJson as Record<string, unknown>;
      templateId = template.id;

      // Increment usage counter (fire-and-forget)
      prisma.appTemplate.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      }).catch(() => { /* non-critical */ });
    }

    // Extract short name from title, max 12 chars
    const shortName = data.title
      ? (data.title.split(' ')[0] || data.title).substring(0, 12)
      : 'App';

    // Merge template colors if present
    const colorScheme = templateConfig?.colorScheme as { primary?: string; secondary?: string } | undefined;

    // Create app project with retry for transient DB errors
    const appProject = await withRetry(() =>
      prisma.appProject.create({
        data: {
          targetUrl: data.url,
          appName: data.title || 'My App',
          shortName,
          themeColor: data.themeColor || colorScheme?.primary || '#178BFF',
          backgroundColor: data.backgroundColor || colorScheme?.secondary || '#ffffff',
          iconUrls: data.iconUrls || null,
          userId: session.user!.id,
          templateId: templateId,
        },
      })
    );

    logger.info('generate', 'App created', {
      userId: session.user.id,
      appId: appProject.id,
      slug: appProject.slug,
      templateSlug: data.templateSlug || null,
    });

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
