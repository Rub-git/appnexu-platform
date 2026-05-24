'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Trash2, Loader2, X } from 'lucide-react';

interface DeleteAppButtonProps {
  appId: string;
  appName: string;
}

export default function DeleteAppButton({ appId, appName }: DeleteAppButtonProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/apps/${appId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setIsOpen(false);
          router.refresh();
        } else {
          const data = await res.json();
          alert(data.error || t('errors.failedToDelete'));
        }
      } catch {
        alert(t('errors.failedToDelete'));
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        title={t('dashboard.appCard.actions.delete')}
      >
        <Trash2 size={18} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('dashboard.deleteDialog.title')}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400">
              {t('dashboard.deleteDialog.message', { appName })}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t('dashboard.deleteDialog.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('dashboard.deleteDialog.confirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
