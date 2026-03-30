/**
 * GET /api/templates
 * List all templates with optional filters.
 * Public endpoint (no auth required) — premium badge shown to all,
 * but actual usage is gated server-side in /api/generate.
 */
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { TemplateCategory } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const premiumOnly = searchParams.get('premium');

    const where: Record<string, unknown> = { isActive: true };
    if (category && Object.values(TemplateCategory).includes(category as TemplateCategory)) {
      where.category = category;
    }
    if (premiumOnly === 'true') {
      where.isPremium = true;
    } else if (premiumOnly === 'false') {
      where.isPremium = false;
    }

    const templates = await prisma.appTemplate.findMany({
      where,
      orderBy: [{ isPremium: 'asc' }, { usageCount: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        previewImage: true,
        configJson: true,
        isPremium: true,
        isActive: true,
        usageCount: true,
      },
    });

    console.log(`Fetched ${templates.length} templates where isActive = true:`, templates);

    return apiSuccess(templates);
  } catch (error) {
    return apiError('Failed to fetch templates', 500, 'INTERNAL_ERROR');
  }
}
