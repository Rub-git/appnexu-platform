'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Navbar() {
  const t = useTranslations();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-black/80">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo size={56} variant="icon" />
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            {t('nav.login')}
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#178BFF] focus:ring-offset-2 dark:focus:ring-offset-black"
          >
            {t('nav.signUp')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
