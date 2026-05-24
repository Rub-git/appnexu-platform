import { revalidateDashboardSummary } from '@/lib/dashboard-cache';
import { revalidateAdminAppsSummary } from '@/lib/admin-apps-cache';

export async function invalidateAppProjectCaches(userId?: string) {
  if (userId) {
    await revalidateDashboardSummary(userId);
  }

  await revalidateAdminAppsSummary();
}
