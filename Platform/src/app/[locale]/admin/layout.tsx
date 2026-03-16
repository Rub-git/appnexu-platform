import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/routing';
import {
  LayoutDashboard,
  Users,
  Smartphone,
  CreditCard,
  Activity,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Logo from '@/components/Logo';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Server-side admin check — this is the REAL access control
  const admin = await requireAdmin();
  if (!admin) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations();

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: t('admin.nav.overview') },
    { href: '/admin/users', icon: Users, label: t('admin.nav.users') },
    { href: '/admin/apps', icon: Smartphone, label: t('admin.nav.apps') },
    { href: '/admin/billing', icon: CreditCard, label: t('admin.nav.billing') },
    { href: '/admin/health', icon: Activity, label: t('admin.nav.health') },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row dark:bg-black">
      {/* Admin Sidebar */}
      <aside className="border-r border-gray-200/60 bg-white md:w-64 md:flex-shrink-0 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center gap-3 px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white">
              <Shield size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              {t('admin.title')}
            </span>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <item.icon className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200/60 p-4 dark:border-gray-800">
            <div className="mb-3">
              <LanguageSwitcher />
            </div>
            <div className="flex items-center gap-2 px-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center dark:bg-red-900/30">
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  {admin.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                  {admin.name || admin.email}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">Admin</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('admin.nav.backToDashboard')}
            </Link>
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
