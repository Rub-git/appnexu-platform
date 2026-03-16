'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Smartphone, Loader2, Download, AlertTriangle, RefreshCw, Check,
} from 'lucide-react';

interface ApkExportButtonProps {
  appId: string;
  appStatus: string;
}

export default function ApkExportButton({ appId, appStatus }: ApkExportButtonProps) {
  const t = useTranslations();
  const [buildStatus, setBuildStatus] = useState<string>('NOT_BUILT');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch current APK status
  useEffect(() => {
    if (appStatus !== 'PUBLISHED') return;
    fetch(`/api/apps/${appId}/apk-status`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setBuildStatus(d.data.status);
          setDownloadUrl(d.data.downloadUrl);
        }
      })
      .catch(() => {});
  }, [appId, appStatus]);

  // Poll when building
  useEffect(() => {
    if (buildStatus !== 'BUILDING') return;
    const interval = setInterval(() => {
      fetch(`/api/apps/${appId}/apk-status`)
        .then((r) => r.json())
        .then((d) => {
          if (d.data) {
            setBuildStatus(d.data.status);
            setDownloadUrl(d.data.downloadUrl);
            if (d.data.status !== 'BUILDING') {
              setLoading(false);
            }
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [buildStatus, appId]);

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setBuildStatus('BUILDING');
    try {
      const res = await fetch(`/api/apps/${appId}/export-apk`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.data) {
        setBuildStatus(data.data.status);
        setDownloadUrl(data.data.downloadUrl);
      } else {
        setBuildStatus('FAILED');
        setError(data.error || 'Build failed');
      }
    } catch {
      setBuildStatus('FAILED');
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Only show for published apps
  if (appStatus !== 'PUBLISHED') return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="h-5 w-5 text-green-600" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('apkExport.title')}
        </h4>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

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

      {(buildStatus === 'BUILDING' || loading) && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('apkExport.building')}</p>
            <p className="text-xs text-gray-500">{t('apkExport.buildingDesc')}</p>
          </div>
        </div>
      )}

      {buildStatus === 'READY' && downloadUrl && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('apkExport.ready')}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={downloadUrl}
              className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('apkExport.download')}
            </a>
            <button
              onClick={handleExport}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {t('apkExport.rebuild')}
            </button>
          </div>
        </div>
      )}

      {buildStatus === 'FAILED' && !loading && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('apkExport.failed')}</p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('apkExport.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
