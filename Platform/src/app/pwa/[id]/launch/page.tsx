import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Redirecting',
    description: 'Redirecting to your app',
  };
}

export default async function AppLaunchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let app: { targetUrl: string; status: string; appName: string } | null = null;
  try {
    app = await prisma.appProject.findUnique({
      where: { id },
      select: { targetUrl: true, status: true, appName: true },
    });
  } catch (error) {
    console.error('[PWA Launch] DB error:', error);
    // Fall through to the unavailable page below
  }

  // Primary path: redirect to targetUrl if available (regardless of status).
  // The user already installed the PWA; they should reach the destination site
  // even if the admin later un-publishes or the status changes.
  if (app?.targetUrl) {
    redirect(app.targetUrl);
  }

  // Fallback: app deleted or has no targetUrl → show a friendly offline page
  // instead of a 404 that would confuse standalone PWA users.
  const appName = app?.appName || 'App';
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-black">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
          {appName} no disponible
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Esta aplicación ya no está disponible o fue eliminada por su propietario.
        </p>
        <a
          href="https://appnexu.com"
          className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ir a Appnexu
        </a>
      </div>
    </main>
  );
}