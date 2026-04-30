'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Smartphone, Loader2, Download, AlertTriangle, RefreshCw, Check, ExternalLink,
} from 'lucide-react';

interface ApkExportButtonProps {
  appId: string;
  appStatus: string;
}

export default function ApkExportButton({ appId, appStatus }: ApkExportButtonProps) {
  const t = useTranslations();
  const [buildStatus, setBuildStatus] = useState<string>('NOT_BUILT');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const applyStatus = (data: { status: string; downloadUrl?: string | null; errorMessage?: string | null }) => {
    setBuildStatus(data.status);
    setDownloadUrl(data.downloadUrl ?? null);
    setErrorMessage(data.errorMessage ?? null);
  };

  // Fetch current APK status on mount
  useEffect(() => {
    if (appStatus !== 'PUBLISHED') return;
    fetch(`/api/apps/${appId}/apk-status`)
      .then((r) => r.json())
      .then((d) => { if (d.data) applyStatus(d.data); })
      .catch(() => {});
  }, [appId, appStatus]);

  // Poll every 8 s while BUILDING
  useEffect(() => {
    if (buildStatus !== 'BUILDING') {
      stopPolling();
      return;
    }
    stopPolling(); // clear any existing interval
    pollRef.current = setInterval(() => {
      fetch(`/api/apps/${appId}/apk-status`)
        .then((r) => r.json())
        .then((d) => {
          if (d.data) {
            applyStatus(d.data);
            if (d.data.status !== 'BUILDING') {
              setLoading(false);
              stopPolling();
            }
          }
        })
        .catch(() => {});
    }, 8_000);
    return stopPolling;
  }, [buildStatus, appId]);

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setErrorMessage(null);
    setBuildStatus('BUILDING');
    try {
      const res = await fetch(`/api/apps/${appId}/export-apk`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.data) {
        applyStatus(data.data);
        // keep loading=true until polling resolves (status still BUILDING)
        if (data.data.status !== 'BUILDING') setLoading(false);
      } else {
        setBuildStatus('FAILED');
        setError(data.error || 'Failed to start build');
        setLoading(false);
      }
    } catch {
      setBuildStatus('FAILED');
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  if (appStatus !== 'PUBLISHED') return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="h-5 w-5 text-green-600" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('apkExport.title')}
        </h4>
      </div>

      {/* Dispatch/network error */}
      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* NOT_BUILT */}
      {buildStatus === 'NOT_BUILT' && (
        <div>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {t('apkExport.description')}
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Smartphone className="mr-2 h-4 w-4" />
            {t('apkExport.exportButton')}
          </button>
        </div>
      )}

      {/* BUILDING */}
      {(buildStatus === 'BUILDING' || (loading && buildStatus !== 'FAILED')) && (
        <div className="flex items-start gap-3">
          <Loader2 className="mt-0.5 h-5 w-5 animate-spin flex-shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('apkExport.building')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('apkExport.buildingDesc')}</p>
          </div>
        </div>
      )}

      {/* READY */}
      {buildStatus === 'READY' && downloadUrl && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('apkExport.ready')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('apkExport.download')}
            </a>
            <button
              onClick={handleExport}
              disabled={loading}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {t('apkExport.rebuild')}
            </button>
          </div>
        </div>
      )}

      {/* FAILED */}
      {buildStatus === 'FAILED' && !loading && (
        <div>
          <div className="mb-2 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('apkExport.failed')}</p>
              {errorMessage && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400 break-all">{errorMessage}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('apkExport.retry')}
          </button>
        </div>
      )}
    </div>
  );
}

