/**
 * GET /api/templates/[slug]
 * Get a single template by slug.
 */
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Basic input validation
    if (!slug || !/^[a-z0-9-]+$/.test(slug) || slug.length > 100) {
      return apiError('Invalid template slug', 400, 'INVALID_INPUT');
    }

    const template = await prisma.appTemplate.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        previewImage: true,
        configJson: true,
        isPremium: true,
        usageCount: true,
      },
    });

    if (!template) {
      return apiError('Template not found', 404, 'NOT_FOUND');
    }

    return apiSuccess(template);
  } catch (error) {
    return apiError('Failed to fetch template', 500, 'INTERNAL_ERROR');
  }
}
