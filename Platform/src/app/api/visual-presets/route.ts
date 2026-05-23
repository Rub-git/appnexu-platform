import { apiError, apiSuccess } from '@/lib/api-utils';
import { VISUAL_PRESETS } from '@/lib/visual-presets';

export async function GET() {
  try {
    return apiSuccess(VISUAL_PRESETS);
  } catch {
    return apiError('Failed to fetch visual presets', 500, 'INTERNAL_ERROR');
  }
}
