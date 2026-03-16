/**
 * GET /api/admin/users
 * 
 * Returns paginated list of users with filters.
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
    const planFilter = url.searchParams.get('plan') || '';
    const roleFilter = url.searchParams.get('role') || '';
    const sortBy = url.searchParams.get('sort') || 'createdAt';
    const sortOrder = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (planFilter && ['FREE', 'PRO', 'AGENCY'].includes(planFilter)) {
      where.plan = planFilter as 'FREE' | 'PRO' | 'AGENCY';
    }

    if (roleFilter && ['USER', 'ADMIN'].includes(roleFilter)) {
      where.role = roleFilter as 'USER' | 'ADMIN';
    }

    // Validate sort field
    const validSortFields = ['createdAt', 'email', 'name', 'plan', 'role'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [safeSortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          role: true,
          stripeCustomerId: true,
          createdAt: true,
          _count: { select: { apps: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return apiSuccess({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return apiError('Failed to fetch users', 500, 'INTERNAL_ERROR');
  }
}
