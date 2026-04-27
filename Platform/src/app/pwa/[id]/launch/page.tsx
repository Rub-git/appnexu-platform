import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';

export default async function AppLaunchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const app = await prisma.appProject.findUnique({
    where: { id },
    select: {
      appName: true,
      slug: true,
      targetUrl: true,
      status: true,
    },
  });

  if (!app || !app.targetUrl) {
    notFound();
  }

  if (app.status !== 'PUBLISHED') {
    notFound();
  }

  // Keep launch navigation inside the generated app route/scope so the installed
  // app opens as standalone window mode instead of falling back to browser chrome.
  return redirect(`/app/${app.slug}?pwa=true`);
}
