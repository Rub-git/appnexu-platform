import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

function findHeader(headers: Headers, key: string): string | null {
  return headers.get(key) || headers.get(key.toLowerCase());
}

function normalizeAuditOrigin(requestOrigin: string, hostParam: string | null): string {
  if (!hostParam) return requestOrigin;
  const host = hostParam.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!host) return requestOrigin;
  return `https://${host}`;
}

async function checkUrl(url: string): Promise<{ url: string; status: number | null; ok: boolean; error?: string }> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return { url, status: response.status, ok: response.ok };
  } catch (error) {
    return {
      url,
      status: null,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// GET /api/apps/[id]/pwa-debug
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const app = await prisma.appProject.findUnique({
      where: { id },
      select: { id: true, appName: true, status: true },
    });

    if (!app) {
      return apiError('App not found', 404, 'NOT_FOUND');
    }

    const requestUrl = new URL(request.url);
    const auditOrigin = normalizeAuditOrigin(
      requestUrl.origin,
      requestUrl.searchParams.get('host')
    );

    const installUrl = `${auditOrigin}/pwa/${id}/install`;
    const launchUrl = `${auditOrigin}/pwa/${id}/launch`;
    const swUrl = `${auditOrigin}/pwa/${id}/sw.js`;
    const manifestUrl = `${auditOrigin}/pwa/${id}/manifest.json`;

    const installStatus = await checkUrl(installUrl);
    const manifestStatus = await checkUrl(manifestUrl);
    const launchStatus = await checkUrl(launchUrl);
    const swStatus = await checkUrl(swUrl);

    let manifestJson: unknown = null;
    let manifestScope: string | null = null;
    let startUrlStatus: { url: string; status: number | null; ok: boolean; error?: string } | null = null;
    let icon192Status: { url: string; status: number | null; ok: boolean; error?: string } | null = null;
    let icon512Status: { url: string; status: number | null; ok: boolean; error?: string } | null = null;

    if (manifestStatus.ok) {
      try {
        const manifestResponse = await fetch(manifestUrl, { cache: 'no-store' });
        manifestJson = await manifestResponse.json();

        const manifestObj = manifestJson as {
          start_url?: string;
          scope?: string;
          icons?: Array<{ src?: string; sizes?: string }>;
        };

        manifestScope = manifestObj.scope || null;

        if (manifestObj.start_url) {
          const startUrl = new URL(manifestObj.start_url, auditOrigin).toString();
          startUrlStatus = await checkUrl(startUrl);
        }

        const icons = manifestObj.icons || [];
        const icon192 = icons.find((icon) => icon.sizes === '192x192' || (icon.src || '').includes('192'))?.src;
        const icon512 = icons.find((icon) => icon.sizes === '512x512' || (icon.src || '').includes('512'))?.src;

        if (icon192) {
          icon192Status = await checkUrl(new URL(icon192, auditOrigin).toString());
        }

        if (icon512) {
          icon512Status = await checkUrl(new URL(icon512, auditOrigin).toString());
        }
      } catch (error) {
        manifestJson = {
          error: error instanceof Error ? error.message : 'Failed to parse manifest',
        };
      }
    }

    let hasManifestLinkOnInstallPage = false;
    if (installStatus.ok) {
      try {
        const installResponse = await fetch(installUrl, { cache: 'no-store' });
        const html = await installResponse.text();
        hasManifestLinkOnInstallPage = /<link[^>]+rel=["']manifest["']/i.test(html);
      } catch {
        hasManifestLinkOnInstallPage = false;
      }
    }

    const serviceWorkerScopeExpected = `/pwa/${id}/`;
    const swAllowedHeader = swStatus.ok ? await (async () => {
      const response = await fetch(swUrl, { cache: 'no-store' });
      return findHeader(response.headers, 'Service-Worker-Allowed');
    })() : null;

    const manifestObj = (manifestJson && typeof manifestJson === 'object'
      ? (manifestJson as {
          id?: string;
          name?: string;
          short_name?: string;
          start_url?: string;
          scope?: string;
          display?: string;
          theme_color?: string;
          background_color?: string;
          icons?: Array<{ sizes?: string; src?: string }>;
        })
      : null);

    const installabilityErrors: string[] = [];
    if (!installStatus.ok) installabilityErrors.push(`Install URL returned ${installStatus.status ?? 'network error'}`);
    if (!manifestStatus.ok) installabilityErrors.push(`Manifest could not be fetched (${manifestStatus.status ?? 'network error'})`);
    if (!manifestObj) installabilityErrors.push('Manifest JSON missing or invalid');
    if (manifestObj) {
      if (!manifestObj.id) installabilityErrors.push('Manifest missing id');
      if (!manifestObj.name) installabilityErrors.push('Manifest missing name');
      if (!manifestObj.short_name) installabilityErrors.push('Manifest missing short_name');
      if (!manifestObj.start_url) installabilityErrors.push('Manifest missing start_url');
      if (!manifestObj.scope) installabilityErrors.push('Manifest missing scope');
      if (manifestObj.display !== 'standalone') installabilityErrors.push(`Manifest display is not standalone (${manifestObj.display ?? 'missing'})`);
      if (!manifestObj.theme_color) installabilityErrors.push('Manifest missing theme_color');
      if (!manifestObj.background_color) installabilityErrors.push('Manifest missing background_color');
      const iconSizes = new Set((manifestObj.icons || []).map((icon) => icon.sizes));
      if (!iconSizes.has('192x192')) installabilityErrors.push('Manifest missing 192x192 icon');
      if (!iconSizes.has('512x512')) installabilityErrors.push('Manifest missing 512x512 icon');
    }
    if (icon192Status && !icon192Status.ok) installabilityErrors.push(`Icon 192 returned ${icon192Status.status ?? 'network error'}`);
    if (icon512Status && !icon512Status.ok) installabilityErrors.push(`Icon 512 returned ${icon512Status.status ?? 'network error'}`);
    if (!swStatus.ok) installabilityErrors.push(`Service worker script returned ${swStatus.status ?? 'network error'}`);
    if (swAllowedHeader !== serviceWorkerScopeExpected) {
      installabilityErrors.push(
        `Service-Worker-Allowed mismatch (${swAllowedHeader ?? 'missing'}), expected ${serviceWorkerScopeExpected}`
      );
    }
    if (!startUrlStatus || !startUrlStatus.ok) {
      installabilityErrors.push(`start_url returned ${startUrlStatus?.status ?? 'missing'}`);
    }
    if (startUrlStatus && startUrlStatus.url && !startUrlStatus.url.includes(serviceWorkerScopeExpected)) {
      installabilityErrors.push(`start_url is outside expected scope (${startUrlStatus.url})`);
    }

    return apiSuccess({
      appId: app.id,
      appName: app.appName,
      appStatus: app.status,
      auditOrigin,
      installUrl,
      manifestUrl,
      manifestStatus,
      manifestJson,
      startUrlStatus,
      scope: manifestScope,
      launchUrlStatus: launchStatus,
      swUrlStatus: swStatus,
      swUrl,
      swAllowedHeader,
      icon192Status,
      icon512Status,
      hasManifestLinkOnInstallPage,
      serviceWorkerScopeExpected,
      serviceWorkerRegisteredWithExpectedScope: null,
      serviceWorkerRegisteredWithExpectedScopeNote:
        'Client-side state cannot be verified from a server API route. Use browser diagnostics panel or DevTools.',
      manifest_status: manifestStatus,
      manifest_json: manifestJson,
      icon_192_status: icon192Status,
      icon_512_status: icon512Status,
      sw_status: swStatus,
      sw_scope: swAllowedHeader,
      start_url_status: startUrlStatus,
      launch_status: launchStatus,
      beforeinstallprompt: null,
      display_mode: null,
      installability_errors: installabilityErrors,
    });
  } catch (error) {
    return apiError('Failed to build PWA debug payload', 500, 'INTERNAL_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
