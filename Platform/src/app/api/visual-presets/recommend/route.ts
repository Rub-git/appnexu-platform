import { apiError, apiSuccess } from '@/lib/api-utils';
import { analyzeSchema, formatZodErrors } from '@/lib/validations';
import { recommendVisualPreset } from '@/lib/visual-presets';

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400, 'INVALID_JSON');
    }

    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', formatZodErrors(parsed.error));
    }

    const input = parsed.data;
    const recommendation = recommendVisualPreset({
      url: input.url,
      title: (body as { title?: string }).title,
      detectedThemeColor: (body as { themeColor?: string | null }).themeColor ?? null,
    });

    return apiSuccess(recommendation);
  } catch {
    return apiError('Failed to recommend visual preset', 500, 'INTERNAL_ERROR');
  }
}
