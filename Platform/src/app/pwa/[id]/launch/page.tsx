import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Redirecting',
    description: 'Redirecting to install entry',
  };
}

export default async function AppLaunchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await prisma.appProject.findUnique({
    where: { id },
    select: { targetUrl: true, status: true },
  });

  if (app?.targetUrl && app.status === 'PUBLISHED') {
    redirect(app.targetUrl);
  }

  redirect(`/pwa/${id}/install?admin=1`);
}
