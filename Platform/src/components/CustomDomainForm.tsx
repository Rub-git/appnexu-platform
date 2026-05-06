'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Globe, Loader2, Check, X, Info } from 'lucide-react';

interface CustomDomainFormProps {
  appId: string;
  currentDomain: string | null;
}

export default function CustomDomainForm({ appId, currentDomain }: CustomDomainFormProps) {
  const [domain, setDomain] = useState(currentDomain || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    setDomain(currentDomain || '');
  }, [currentDomain]);

  const normalizeDomain = (value: string): string => {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/\.+$/, '');
  };

  const isValidDomain = (value: string): boolean => {
    return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(value);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const normalizedDomain = normalizeDomain(domain);

    if (normalizedDomain.length > 0 && !isValidDomain(normalizedDomain)) {
      setError('Invalid domain format. Example: app.example.com');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/apps/${appId}/domain`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain: normalizedDomain || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update domain');
      }

      setDomain(normalizedDomain);
      setSuccess(t('customDomain.saved'));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update domain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/apps/${appId}/domain`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove domain');
      }

      setDomain('');
      setSuccess(t('customDomain.removed'));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove domain');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Globe className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('customDomain.title')}
        </h3>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <X className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <Check className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(normalizeDomain(e.target.value))}
          placeholder="app.yourdomain.com"
          className="w-full xl:flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {t('common.save')}
        </button>
        {currentDomain && (
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* DNS Instructions */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium">{t('customDomain.dnsTitle')}</p>
            <p className="mt-1">{t('customDomain.dnsInstructions')}</p>
            <div className="mt-2 rounded bg-blue-100 p-2 font-mono text-xs dark:bg-blue-900/40">
              <p>Root/apex domain (example.com): Type A or ALIAS - Value 76.76.21.21</p>
              <p>www subdomain (www.example.com): Type CNAME - Value cname.vercel-dns.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
