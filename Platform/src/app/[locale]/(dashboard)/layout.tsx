import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { LayoutDashboard, PlusCircle, Settings, Shield, LayoutTemplate } from 'lucide-react';
import SignOutButton from '@/components/SignOutButton';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Logo from '@/components/Logo';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const session = await auth();
  
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations();

  // Check if user is admin (for showing admin link)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row dark:bg-black">
      {/* Sidebar */}
      <aside className="border-r border-gray-200/60 bg-white md:w-64 md:flex-shrink-0 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-full flex-col">
          <div className="flex h-48 items-center justify-between px-6">
            <Link href="/dashboard" className="transition-opacity hover:opacity-80">
              <Logo size={168} variant="icon" />
            </Link>
            <div className="md:hidden">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              <Link
                href="/dashboard"
                className="flex items-center rounded-xl bg-gradient-to-r from-[#178BFF]/10 to-[#5B2CCF]/10 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                <LayoutDashboard className="mr-3 h-5 w-5 text-[#178BFF]" />
                {t('nav.myApps')}
              </Link>
              <Link
                href="/dashboard/create"
                className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <PlusCircle className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                {t('nav.createApp')}
              </Link>
              <Link
                href="/templates"
                className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <LayoutTemplate className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                {t('templates.badge')}
              </Link>
              <Link
                href="/settings"
                className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <Settings className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                {t('nav.settings')}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                >
                  <Shield className="mr-3 h-5 w-5" />
                  {t('admin.title')}
                </Link>
              )}
            </nav>
          </div>

          <div className="border-t border-gray-200/60 p-4 dark:border-gray-800">
            <div className="mb-3 hidden md:block">
              <LanguageSwitcher />
            </div>
            <div className="flex items-center gap-3 mb-3 px-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#178BFF]/20 to-[#5B2CCF]/20 flex items-center justify-center">
                <span className="text-sm font-medium text-[#178BFF]">
                  {session.user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {session.user.name || session.user.email}
                </p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
