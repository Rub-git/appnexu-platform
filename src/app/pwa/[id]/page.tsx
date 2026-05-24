import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function PwaAppEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const app = await prisma.appProject.findUnique({
    where: { id },
    select: {
      status: true,
      targetUrl: true,
      customDomain: true,
    },
  });

  if (app?.status === 'PUBLISHED') {
    if (app.customDomain) {
      redirect(`https://${app.customDomain}/`);
    }

    if (app.targetUrl) {
      redirect(app.targetUrl);
    }
  }

  redirect(`/pwa/${id}/install?admin=1`);
}
