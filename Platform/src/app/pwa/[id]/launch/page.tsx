import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

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
      targetUrl: true,
      status: true,
    },
  });

  if (!app || !app.targetUrl) {
    notFound();
  }

  // Public apps should open directly into the target website when launched from installed PWA.
  if (app.status !== 'PUBLISHED') {
    notFound();
  }

  return (
    <main className="h-dvh w-screen overflow-hidden bg-white">
      <iframe
        src={app.targetUrl}
        className="h-full w-full border-0"
        title={`${app.appName} App`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}
