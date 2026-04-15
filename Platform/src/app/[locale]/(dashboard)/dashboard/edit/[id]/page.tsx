'use client';

import { useState, useEffect, use } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface App {
  id: string;
  appName: string;
  shortName: string | null;
  themeColor: string | null;
  backgroundColor: string | null;
  iconUrls: string | null;
}

export default function EditAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const router = useRouter();

  const [app, setApp] = useState<App | null>(null);
  const [appName, setAppName] = useState('');
  const [shortName, setShortName] = useState('');
  const [themeColor, setThemeColor] = useState('#178BFF');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [iconUrls, setIconUrls] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await fetch(`/api/apps/${id}`);
        if (!res.ok) throw new Error('Failed to fetch app');
        const data = await res.json();
        const appData = data.data?.app || data.app;
        setApp(appData);
        setAppName(appData.appName);
        setShortName(appData.shortName || '');
        setThemeColor(appData.themeColor || '#178BFF');
        setBackgroundColor(appData.backgroundColor || '#ffffff');
        setIconUrls(appData.iconUrls || '');
      } catch (err) {
        setError(t('errors.appNotFound'));
      } finally {
        setIsLoading(false);
      }
    }
    fetchApp();
  }, [id, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/apps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          shortName: shortName || undefined,
          themeColor,
          backgroundColor,
          iconUrls: iconUrls.trim() ? iconUrls : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('errors.failedToSave'));
      }

      router.push(`/dashboard/preview/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToSave'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 dark:text-gray-400">{error || t('errors.appNotFound')}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-primary hover:underline">
          {t('preview.backToApps')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <Link 
          href={`/dashboard/preview/${id}`} 
          className="mb-2 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('common.back')}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t('editApp.title')}
        </h1>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="appName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('editApp.form.appName')}
            </label>
            <input
              type="text"
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="shortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('editApp.form.shortName')}
            </label>
            <input
              type="text"
              id="shortName"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              maxLength={12}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="iconUrls" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('editApp.form.iconUrls')}
            </label>
            <textarea
              id="iconUrls"
              value={iconUrls}
              onChange={(e) => setIconUrls(e.target.value)}
              rows={4}
              placeholder={t('editApp.form.iconUrlsPlaceholder')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('editApp.form.iconUrlsHelp')}
            </p>
            {iconUrls.trim() && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {iconUrls.split(',').map((url) => url.trim()).filter(Boolean).map((url, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Icon ${index + 1}`} className="h-16 w-16 rounded-xl object-cover" />
                    <p className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400">{url}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="themeColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('editApp.form.themeColor')}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  id="themeColor"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="h-10 w-14 rounded cursor-pointer border border-gray-300 dark:border-gray-700"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('editApp.form.backgroundColor')}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  id="backgroundColor"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-10 w-14 rounded cursor-pointer border border-gray-300 dark:border-gray-700"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link
              href={`/dashboard/preview/${id}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t('common.cancel')}
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('editApp.form.saving')}
                </>
              ) : (
                t('editApp.form.saveButton')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
