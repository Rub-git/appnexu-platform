/**
 * GET /api/admin/billing
 * 
 * Returns billing/subscription overview for all users.
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
    const planFilter = url.searchParams.get('plan') || '';
    const stripeLinked = url.searchParams.get('stripeLinked');
    const search = url.searchParams.get('search')?.trim() || '';

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

    if (stripeLinked === 'true') {
      where.stripeCustomerId = { not: null };
    } else if (stripeLinked === 'false') {
      where.stripeCustomerId = null;
    }

    const [users, total, planBreakdown] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          stripeCustomerId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { apps: true } },
        },
      }),
      prisma.user.count({ where }),
      // Plan distribution
      prisma.user.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
    ]);

    // Count Stripe-linked users
    const stripeLinkedCount = await prisma.user.count({
      where: { stripeCustomerId: { not: null } },
    });

    return apiSuccess({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        planBreakdown: planBreakdown.map((p) => ({
          plan: p.plan,
          count: p._count.plan,
        })),
        stripeLinkedCount,
        totalUsers: total,
      },
    });
  } catch (error) {
    return apiError('Failed to fetch billing data', 500, 'INTERNAL_ERROR');
  }
}
