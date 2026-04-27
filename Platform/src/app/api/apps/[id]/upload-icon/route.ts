import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

    const app = await prisma.appProject.findUnique({ where: { id } });
    if (!app) return apiError('App not found', 404, 'NOT_FOUND');
    if (app.userId !== session.user.id) return apiError('Forbidden', 403, 'FORBIDDEN');

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError('Invalid form data', 400, 'INVALID_BODY');
    }

    const file = formData.get('icon');
    if (!file || !(file instanceof File)) {
      return apiError('No icon file provided', 400, 'NO_FILE');
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return apiError('Tipo de archivo inválido. Usa PNG, JPG, WEBP o SVG.', 400, 'INVALID_TYPE');
    }

    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      return apiError('Archivo muy grande. Máximo 5 MB.', 400, 'FILE_TOO_LARGE');
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Normalize to a transparent 512x512 canvas with padded centered logo.
    // This prevents stretched/tiny icons and removes outer white icon borders when possible.
    const trimmed = await sharp(buffer)
      .rotate()
      .trim({
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        threshold: 10,
      })
      .png()
      .toBuffer();

    const logo = await sharp(trimmed)
      .resize(420, 420, {
        fit: 'contain',
        position: 'centre',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const png512 = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: logo, gravity: 'centre' }])
      .png({ compressionLevel: 8, quality: 90 })
      .toBuffer();

    // Store as 'upload:BASE64' — no comma in the value, safe for comma-separated iconUrls field.
    // (data:image/png;base64,XXX contains a comma that would break CSV parsing)
    const base64Data = png512.toString('base64');
    const uploadToken = `upload:${base64Data}`;

    // Keep only external (http/https) URLs; drop old upload: tokens and old data: blobs
    const existingExternalUrls = (app.iconUrls || '')
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u && !u.startsWith('upload:') && !u.startsWith('data:image/'));

    // Prepend our uploaded logo so it is the primary (first) icon
    const newIconUrls = [uploadToken, ...existingExternalUrls].join(',');

    await prisma.appProject.update({
      where: { id },
      data: { iconUrls: newIconUrls },
    });

    logger.info('upload-icon', 'Logo uploaded', { appId: id, userId: session.user.id, sizeKb: Math.round(png512.length / 1024) });

    // Return a proper data URL so the UI can render a preview
    const dataUrl = `data:image/png;base64,${base64Data}`;
    return NextResponse.json({
      success: true,
      dataUrl,
    });
  } catch (error) {
    logger.error('upload-icon', 'Failed to process image', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('No se pudo procesar la imagen', 500, 'INTERNAL_ERROR');
  }
}

// DELETE — remove all uploaded (data:) icons for this app
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
    const app = await prisma.appProject.findUnique({ where: { id } });
    if (!app) return apiError('App not found', 404, 'NOT_FOUND');
    if (app.userId !== session.user.id) return apiError('Forbidden', 403, 'FORBIDDEN');

    // Keep only external URLs; remove all upload: tokens and legacy data: blobs
    const remaining = (app.iconUrls || '')
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u && !u.startsWith('upload:') && !u.startsWith('data:image/'))
      .join(',');

    await prisma.appProject.update({
      where: { id },
      data: { iconUrls: remaining },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('upload-icon', 'Failed to delete icon', { error: error instanceof Error ? error.message : 'Unknown' });
    return apiError('No se pudo eliminar el logo', 500, 'INTERNAL_ERROR');
  }
}
