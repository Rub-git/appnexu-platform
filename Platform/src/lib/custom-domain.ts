const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function normalizeCustomDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^www\./, '');
}

export function isValidCustomDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(domain);
}

export function getNormalizedHostnameFromUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  try {
    const prepared = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const hostname = new URL(prepared).hostname;
    return normalizeCustomDomain(hostname);
  } catch {
    return null;
  }
}

export function getCustomDomainCandidates(normalizedDomain: string): string[] {
  const prefixed = `www.${normalizedDomain}`;
  return [
    normalizedDomain,
    prefixed,
    `https://${normalizedDomain}`,
    `http://${normalizedDomain}`,
    `https://${prefixed}`,
    `${normalizedDomain}/`,
    `${prefixed}/`,
    `https://${normalizedDomain}/`,
    `http://${normalizedDomain}/`,
    `https://${prefixed}/`,
  ];
}