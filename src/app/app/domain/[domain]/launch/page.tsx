import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getCustomDomainCandidates, normalizeCustomDomain } from '@/lib/custom-domain';
import { headers } from 'next/headers';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const normalizedDomain = normalizeCustomDomain(domain);
  const domainCandidates = getCustomDomainCandidates(normalizedDomain);
  const app = await prisma.appProject.findFirst({
    where: { customDomain: { in: domainCandidates } },
    select: { appName: true, status: true },
  });

  if (!app || app.status !== 'PUBLISHED') {
    return {};
  }

  return {
    title: app.appName,
    applicationName: app.appName,
    description: `${app.appName} - Launch`,
  };
}

export default async function CustomDomainLaunchPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const normalizedDomain = normalizeCustomDomain(domain);
  const domainCandidates = getCustomDomainCandidates(normalizedDomain);
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || '';

  const app = await prisma.appProject.findFirst({
    where: { customDomain: { in: domainCandidates } },
    select: {
      status: true,
      targetUrl: true,
    },
  });

  if (!app || app.status !== 'PUBLISHED') {
    notFound();
  }

  if (!host.toLowerCase().includes(normalizedDomain)) {
    // Route should be reached through host-based rewrite for the same domain.
    notFound();
  }

  // Installed app entrypoint must go to the real converted website.
  redirect(app.targetUrl);
}
