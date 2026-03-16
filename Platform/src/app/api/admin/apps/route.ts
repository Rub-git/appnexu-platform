/**
 * GET /api/admin/apps
 * 
 * Returns paginated list of apps with filters.
 * Requires ADMIN role.
 */
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return apiError('Forbidden', 403, 'FORBIDDEN');
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const search = url.searchParams.get('search')?.trim() || '';
    const statusFilter = url.searchParams.get('status') || '';
    const ownerPlan = url.searchParams.get('ownerPlan') || '';
    const hasCustomDomain = url.searchParams.get('hasCustomDomain');
    const publishedOnly = url.searchParams.get('published');
    const sortBy = url.searchParams.get('sort') || 'createdAt';
    const sortOrder = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where: Prisma.AppProjectWhereInput = {};

    if (search) {
      where.OR = [
        { appName: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { targetUrl: { contains: search, mode: 'insensitive' } },
      ];
    }

    const validStatuses = ['DRAFT', 'QUEUED', 'GENERATING', 'STAGED', 'PUBLISHED', 'FAILED'];
    if (statusFilter && validStatuses.includes(statusFilter)) {
      where.status = statusFilter as Prisma.EnumAppStatusFilter;
    }

    if (ownerPlan && ['FREE', 'PRO', 'AGENCY'].includes(ownerPlan)) {
      where.user = { plan: ownerPlan as 'FREE' | 'PRO' | 'AGENCY' };
    }

    if (hasCustomDomain === 'true') {
      where.customDomain = { not: null };
    } else if (hasCustomDomain === 'false') {
      where.customDomain = null;
    }

    if (publishedOnly === 'true') {
      where.status = 'PUBLISHED';
    } else if (publishedOnly === 'false') {
      where.status = { not: 'PUBLISHED' };
    }

    const validSortFields = ['createdAt', 'appName', 'status', 'totalVisits', 'updatedAt'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [apps, total] = await Promise.all([
      prisma.appProject.findMany({
        where,
        orderBy: { [safeSortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          appName: true,
          slug: true,
          targetUrl: true,
          status: true,
          customDomain: true,
          totalVisits: true,
          uniqueVisitors: true,
          totalInstalls: true,
          failureReason: true,
          retryCount: true,
          lastGeneratedAt: true,
          lastPublishedAt: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              plan: true,
            },
          },
        },
      }),
      prisma.appProject.count({ where }),
    ]);

    return apiSuccess({
      apps,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return apiError('Failed to fetch apps', 500, 'INTERNAL_ERROR');
  }
}
