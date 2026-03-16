'use client';

import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const t = useTranslations();

  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      <LogOut className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
      {t('nav.signOut')}
    </button>
  );
}
