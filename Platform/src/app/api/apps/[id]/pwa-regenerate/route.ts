import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getAppAssetVersion, getAppManifestUrl, getAppNamedIconUrl, getAppServiceWorkerUrl } from '@/lib/pwa-assets';
import { invalidateAppProjectCaches } from '@/lib/app-project-cache';

type RegeneratePayload = {
  forceGenerator?: boolean;
};

// POST /api/apps/[id]/pwa-regenerate
// Regenerates dynamic PWA assets for legacy apps by bumping version metadata.
export async function POST(
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

    let payload: RegeneratePayload = {};
    try {
      payload = (await request.json()) as RegeneratePayload;
    } catch {
      payload = {};
    }

    const app = await prisma.appProject.findUnique({ where: { id } });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    if (app.userId !== session.user.id) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const forceGenerator = payload.forceGenerator === true;
    const now = new Date();

    const updated = await prisma.appProject.update({
      where: { id },
      data: {
        pwaMode: forceGenerator ? 'GENERATOR' : app.pwaMode,
        pwaModeManual: forceGenerator ? true : app.pwaModeManual,
        importedManifestUrl: forceGenerator ? null : app.importedManifestUrl,
        importedSwUrl: forceGenerator ? null : app.importedSwUrl,
        importedStartUrl: forceGenerator ? null : app.importedStartUrl,
        importedScope: forceGenerator ? null : app.importedScope,
        importedIconsValid: forceGenerator ? null : app.importedIconsValid,
        lastGeneratedAt: now,
        failureReason: null,
      },
    });

    await invalidateAppProjectCaches(session.user.id);

    const version = getAppAssetVersion(updated);

    logger.info('apps.pwa.regenerate', 'PWA assets regenerated for app', {
      appId: updated.id,
      userId: session.user.id,
      forceGenerator,
      pwaMode: updated.pwaMode,
      version,
    });

    return apiSuccess({
      appId: updated.id,
      pwaMode: updated.pwaMode,
      pwaModeManual: updated.pwaModeManual,
      regeneratedAt: updated.lastGeneratedAt,
      version,
      urls: {
        manifest: getAppManifestUrl(updated.id, version),
        serviceWorker: getAppServiceWorkerUrl(updated.id, version, '/'),
        favicon: getAppNamedIconUrl(updated.id, 'favicon.ico', version),
        appleTouchIcon: getAppNamedIconUrl(updated.id, 'apple-touch-icon.png', version),
        icon192: getAppNamedIconUrl(updated.id, 'icon-192.png', version),
        icon512: getAppNamedIconUrl(updated.id, 'icon-512.png', version),
      },
    });
  } catch (error) {
    logger.error('apps.pwa.regenerate', 'Failed to regenerate PWA assets', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return apiError('Failed to regenerate PWA assets', 500, 'INTERNAL_ERROR');
  }
}
