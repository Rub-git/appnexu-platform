'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Logo from '@/components/Logo';

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Logo size={28} />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.tagline')}
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              {t('footer.links.privacy')}
            </Link>
            <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              {t('footer.links.terms')}
            </Link>
            <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              {t('footer.links.support')}
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
