type AppAssetVersionSource = {
  updatedAt?: Date | string | null;
  lastGeneratedAt?: Date | string | null;
};

function toTimestamp(value?: Date | string | null): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getAppAssetVersion(app: AppAssetVersionSource): string {
  const timestamp = Math.max(
    toTimestamp(app.lastGeneratedAt),
    toTimestamp(app.updatedAt),
  );

  return String(timestamp || Date.now());
}

export function getAppManifestUrl(appId: string, version: string): string {
  return `/pwa/${appId}/manifest.json?v=${encodeURIComponent(version)}`;
}

export function getAppIconUrl(appId: string, size: number, version: string): string {
  return `/api/icon-proxy/${appId}?size=${size}&v=${encodeURIComponent(version)}`;
}

export function getAppServiceWorkerUrl(appId: string, version: string, scope: string): string {
  const params = new URLSearchParams({
    v: version,
    scope,
  });

  return `/pwa/${appId}/sw.js?${params.toString()}`;
}

export function getAppCachePrefix(appId: string): string {
  return `generated-pwa-cache-${appId}`;
}

export function getAppCacheName(appId: string, version: string): string {
  return `${getAppCachePrefix(appId)}-v${version}`;
}