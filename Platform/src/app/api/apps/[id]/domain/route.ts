import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { customDomainSchema, formatZodErrors } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import {
  getCustomDomainCandidates,
  isValidCustomDomain,
  normalizeCustomDomain,
} from '@/lib/custom-domain';

// PATCH - Set or update custom domain
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return apiError('Invalid app ID', 400, 'INVALID_ID');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const parsed = customDomainSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', formatZodErrors(parsed.error));
    }

    const normalizedCustomDomain = parsed.data.customDomain
      ? normalizeCustomDomain(parsed.data.customDomain)
      : null;

    if (normalizedCustomDomain && !isValidCustomDomain(normalizedCustomDomain)) {
      return apiError(
        'Invalid domain format. Example: app.example.com',
        400,
        'INVALID_DOMAIN'
      );
    }

    // Verify ownership
    const app = await prisma.appProject.findUnique({
      where: { id },
    });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    if (app.userId !== session.user.id) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    // Check if domain is already taken by another app
    if (normalizedCustomDomain) {
      const existingApp = await prisma.appProject.findFirst({
        where: {
          customDomain: {
            in: getCustomDomainCandidates(normalizedCustomDomain),
          },
        },
        select: {
          id: true,
          appName: true,
          customDomain: true,
        },
      });

      if (existingApp && existingApp.id !== id) {
        return apiError(
          `Este dominio ya está asignado a la app: ${existingApp.appName} (${existingApp.id})`,
          409,
          'DOMAIN_TAKEN',
          {
            appId: existingApp.id,
            appName: existingApp.appName,
            domain: existingApp.customDomain,
          }
        );
      }

      // Prevent using platform domains
      const platformDomains = ['localhost', 'vercel.app', process.env.NEXT_PUBLIC_APP_DOMAIN].filter(Boolean);
      if (platformDomains.some(d => d && normalizedCustomDomain.includes(d))) {
        return apiError('Cannot use platform domain as custom domain', 400, 'INVALID_DOMAIN');
      }
    }

    const updatedApp = await prisma.appProject.update({
      where: { id },
      data: {
        customDomain: normalizedCustomDomain,
      },
    });

    logger.info('domain', 'Custom domain updated', {
      userId: session.user.id,
      appId: id,
      domain: normalizedCustomDomain || '(removed)',
    });

    return apiSuccess({
      id: updatedApp.id,
      customDomain: updatedApp.customDomain,
    });
  } catch (error) {
    logger.error('domain', 'Custom domain update failed', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to update custom domain', 500, 'INTERNAL_ERROR');
  }
}

// DELETE - Remove custom domain
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return apiError('Invalid app ID', 400, 'INVALID_ID');
    }

    const app = await prisma.appProject.findUnique({
      where: { id },
    });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    if (app.userId !== session.user.id) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    await prisma.appProject.update({
      where: { id },
      data: { customDomain: null },
    });

    logger.info('domain', 'Custom domain removed', { userId: session.user.id, appId: id });

    return apiSuccess();
  } catch (error) {
    logger.error('domain', 'Custom domain removal failed', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to remove custom domain', 500, 'INTERNAL_ERROR');
  }
}
