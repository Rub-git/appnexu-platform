/**
 * Zod validation schemas for all API inputs.
 */
import { z } from 'zod';

// ─── Shared refinements ───────────────────────────────────────────────

/** Reject private/internal network URLs (SSRF prevention). */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    // Block private IPs, localhost, and internal hostnames
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.') || // simplified; covers 172.16-31
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === 'metadata.google.internal' ||
      host === '169.254.169.254' // cloud metadata endpoint
    ) {
      return false;
    }
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return true;
  } catch {
    return false;
  }
}

export const safeUrlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048)
  .refine(isSafeUrl, { message: 'URL not allowed: private or internal addresses are blocked' });

// ─── Auth ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// ─── Analyze ──────────────────────────────────────────────────────────

export const analyzeSchema = z.object({
  url: safeUrlSchema,
});

// ─── Generate app ─────────────────────────────────────────────────────

export const generateSchema = z.object({
  url: safeUrlSchema,
  title: z.string().max(200).optional(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid color format').optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid color format').optional(),
  iconUrls: z.string().max(5000).optional(),
  templateSlug: z.string().max(100).optional(), // template to apply during creation
});

// ─── Update app ───────────────────────────────────────────────────────

export const updateAppSchema = z.object({
  appName: z.string().min(1).max(200).optional(),
  shortName: z.string().max(12).optional(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid color format').optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid color format').optional(),
});

// ─── Custom domain ────────────────────────────────────────────────────

export const customDomainSchema = z.object({
  customDomain: z.string()
    .regex(
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Invalid domain format. Example: app.example.com'
    )
    .max(253)
    .optional()
    .nullable(),
});

// ─── Stripe checkout ──────────────────────────────────────────────────

export const checkoutSchema = z.object({
  plan: z.enum(['PRO', 'AGENCY']),
});

// ─── Template slug ────────────────────────────────────────────────────

export const templateSlugSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Invalid template slug'),
});

/** Helper to format Zod errors into a flat string array */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((e: z.ZodIssue) => {
    const path = e.path.join('.');
    return path ? `${path}: ${e.message}` : e.message;
  });
}
