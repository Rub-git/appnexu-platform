import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { normalizeCustomDomain } from '@/lib/custom-domain';
import { headers } from 'next/headers';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const app = await prisma.appProject.findUnique({
    where: { customDomain: normalizeCustomDomain(domain) },
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
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || '';

  const app = await prisma.appProject.findUnique({
    where: { customDomain: normalizeCustomDomain(domain) },
    select: {
      status: true,
    },
  });

  if (!app || app.status !== 'PUBLISHED') {
    notFound();
  }

  if (!host.toLowerCase().includes(normalizeCustomDomain(domain))) {
    // Route should be reached through host-based rewrite for the same domain.
    notFound();
  }

  // Legacy /launch path: keep compatibility without iframe wrappers.
  redirect('/');
}
