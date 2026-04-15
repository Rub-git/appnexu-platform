import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { updateAppSchema, formatZodErrors } from '@/lib/validations';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// GET - Fetch a single app
export async function GET(
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

    return apiSuccess({ app });
  } catch (error) {
    logger.error('apps.get', 'Failed to fetch app', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to fetch app', 500, 'INTERNAL_ERROR');
  }
}

// PATCH - Update an app
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

    const parsed = updateAppSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', formatZodErrors(parsed.error));
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

    const data = parsed.data;
    const updatedApp = await prisma.appProject.update({
      where: { id },
      data: {
        appName: data.appName ?? app.appName,
        shortName: data.shortName ?? app.shortName,
        themeColor: data.themeColor ?? app.themeColor,
        backgroundColor: data.backgroundColor ?? app.backgroundColor,
        iconUrls: data.iconUrls ?? app.iconUrls,
      },
    });

    logger.info('apps.update', 'App updated', { userId: session.user.id, appId: id });
    return apiSuccess({ app: updatedApp });
  } catch (error) {
    logger.error('apps.update', 'Failed to update app', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to update app', 500, 'INTERNAL_ERROR');
  }
}

// DELETE - Delete an app
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

    await prisma.appProject.delete({
      where: { id },
    });

    logger.info('apps.delete', 'App deleted', { userId: session.user.id, appId: id });
    return apiSuccess();
  } catch (error) {
    logger.error('apps.delete', 'Failed to delete app', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('Failed to delete app', 500, 'INTERNAL_ERROR');
  }
}
