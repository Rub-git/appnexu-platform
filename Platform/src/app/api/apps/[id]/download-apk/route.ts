/**
 * GET /api/apps/[id]/download-apk
 * Serve the APK archive for download.
 *
 * Security: auth + ownership + status check.
 * The download URL is only valid while the /tmp artifacts exist.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    const app = await prisma.appProject.findUnique({
      where: { id },
      select: {
        userId: true,
        apkBuildStatus: true,
        apkBuildUrl: true,
        appName: true,
        slug: true,
      },
    });

    if (!app) return apiError('App not found', 404, 'NOT_FOUND');
    if (app.userId !== session.user.id) return apiError('Forbidden', 403, 'FORBIDDEN');

    if (app.apkBuildStatus !== 'READY') {
      return apiError('APK not available for download', 400, 'NOT_READY');
    }

    // Serve the file directly from /tmp if it exists
    const metaPath = path.join('/tmp', 'apk-output', `${id}.meta.json`);
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (meta.outputPath && fs.existsSync(meta.outputPath)) {
          const fileBuffer = fs.readFileSync(meta.outputPath);
          const safeName = (app.slug || 'app').replace(/[^a-zA-Z0-9_-]/g, '');
          return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${safeName}-capacitor-project.zip"`,
              'Content-Length': String(fileBuffer.length),
            },
          });
        }
      } catch { /* fall through */ }
    }

    // If Vercel Blob URL is stored, redirect to it
    if (app.apkBuildUrl && app.apkBuildUrl.startsWith('https://')) {
      return NextResponse.redirect(app.apkBuildUrl);
    }

    return apiError(
      'APK build artifacts have expired. Please rebuild.',
      410,
      'BUILD_EXPIRED',
    );
  } catch (error) {
    return apiError('Failed to download APK', 500, 'INTERNAL_ERROR');
  }
}
