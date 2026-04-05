'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { signIn } from 'next-auth/react';
import { Loader2, Mail, Lock } from 'lucide-react';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("LOGIN CLICKED");
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn("credentials", {
  email,
  password,
  redirect: false,
});

console.log("LOGIN RESULT:", result);

if (result?.error || !result?.ok) {
  setError(t('auth.errors.invalidCredentials'));
  setIsLoading(false);
  return;
}

window.location.href = `/${locale}/dashboard`;

// 👇 REDIRECCIÓN MANUAL
window.location.href = `/${locale}/dashboard`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-black">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo size={32} />
        </Link>
        <LanguageSwitcher />
      </nav>

      {/* Login Form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-800">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
                {t('auth.signIn.title')}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('auth.signIn.subtitle')}
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.fields.email')}
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-[#178BFF] focus:ring-2 focus:ring-[#178BFF]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.fields.password')}
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-[#178BFF] focus:ring-2 focus:ring-[#178BFF]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:shadow-[#178BFF]/25 focus:outline-none focus:ring-2 focus:ring-[#178BFF] focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('auth.signIn.button')
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              {t('auth.signIn.noAccount')}{' '}
              <Link href="/signup" className="font-medium text-[#178BFF] hover:underline">
                {t('auth.signIn.createAccount')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
