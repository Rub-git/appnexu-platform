'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { Rocket, Loader2, Globe, XCircle, RotateCw, AlertTriangle } from 'lucide-react';

interface PublishButtonProps {
  appId: string;
  appName: string;
  currentStatus: string;
  slug: string;
  failureReason?: string | null;
}

export default function PublishButton({
  appId,
  appName,
  currentStatus,
  slug,
  failureReason,
}: PublishButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState(currentStatus);
  const [liveFailureReason, setLiveFailureReason] = useState(failureReason);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();

  const isPublished = liveStatus === 'PUBLISHED';
  const isGenerating = liveStatus === 'GENERATING';
  const isQueued = liveStatus === 'QUEUED';
  const isFailed = liveStatus === 'FAILED';
  const isProcessing = isQueued || isGenerating;

  // Poll for status updates when processing
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/apps/${appId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      const info = data.data || data;
      setLiveStatus(info.status);
      setLiveFailureReason(info.failureReason);

      if (info.status === 'PUBLISHED' || info.status === 'FAILED') {
        // Refresh server components
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      // Ignore polling errors
    }
  }, [appId, router, startTransition]);

  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [isProcessing, pollStatus]);

  // Sync props to local state when they change
  useEffect(() => {
    setLiveStatus(currentStatus);
    setLiveFailureReason(failureReason);
  }, [currentStatus, failureReason]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/apps/${appId}/publish`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      setShowConfirm(false);
      setLiveStatus('QUEUED');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);

    try {
      const response = await fetch(`/api/apps/${appId}/retry`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry');
      }

      setLiveStatus('QUEUED');
      setLiveFailureReason(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleUnpublish = async () => {
    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/apps/${appId}/publish`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unpublish');
      }

      setLiveStatus('DRAFT');
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish');
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── Queued State ──────────────────────────────────────────────────────────
  if (isQueued) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('publish.queued')}</span>
        </div>
        <button
          onClick={handleUnpublish}
          disabled={isPublishing || isPending}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  // ─── Generating State ──────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('publish.generating')}</span>
        </div>
        <button
          onClick={handleUnpublish}
          disabled={isPublishing || isPending}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  // ─── Failed State ──────────────────────────────────────────────────────────
  if (isFailed) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            {t('publish.failed')}
          </div>
          {liveFailureReason && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400/80">
              {liveFailureReason}
            </p>
          )}
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            {isRetrying ? t('publish.retrying') : t('publish.retryButton')}
          </button>
          <button
            onClick={handleUnpublish}
            disabled={isPublishing || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('publish.backToDraft')}
          </button>
        </div>
      </div>
    );
  }

  // ─── Published State ───────────────────────────────────────────────────────
  if (isPublished) {
    return (
      <div className="space-y-2">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <a
            href={`/${locale}/app/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
          >
            <Globe className="h-4 w-4" />
            {t('publish.viewLive')}
          </a>
          <button
            onClick={handleUnpublish}
            disabled={isPublishing || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {t('publish.unpublish')}
          </button>
        </div>
      </div>
    );
  }

  // ─── Draft State (default) ─────────────────────────────────────────────────
  return (
    <>
      {error && (
        <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {showConfirm ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t('publish.confirmMessage', { appName })}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {isPublishing ? t('publish.publishing') : t('publish.confirmButton')}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isPublishing}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Rocket className="h-4 w-4" />
          {t('publish.button')}
        </button>
      )}
    </>
  );
}
