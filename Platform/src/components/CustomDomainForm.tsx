'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Check, Globe, Info, Loader2, X } from 'lucide-react';

interface CustomDomainFormProps {
  appId: string;
  currentDomain: string | null;
}

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.+$/, '');
}

function isValidDomain(value: string): boolean {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(value);
}

export default function CustomDomainForm({ appId, currentDomain }: CustomDomainFormProps) {
  const [domain, setDomain] = useState(currentDomain || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDnsHelp, setShowDnsHelp] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setDomain(currentDomain || '');
  }, [currentDomain]);

  const dnsState = useMemo(() => {
    if (!currentDomain) return 'Pendiente de configurar';
    return 'Configurado (verificacion en progreso)';
  }, [currentDomain]);

  const connectDomain = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain || !isValidDomain(normalizedDomain)) {
      setError('Dominio invalido. Ejemplo: app.ejemplo.com');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/apps/${appId}/domain`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain: normalizedDomain }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo conectar el dominio');

      setDomain(normalizedDomain);
      setSuccess('Dominio conectado correctamente.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar el dominio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dominio personalizado</h3>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-300">
        Estado DNS: <span className="font-semibold">{dnsState}</span>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <X className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          {success}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={domain}
          onChange={(event) => setDomain(normalizeDomain(event.target.value))}
          placeholder="app.tudominio.com"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="button"
          onClick={connectDomain}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Conectar dominio
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowDnsHelp((value) => !value)}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 underline decoration-dotted underline-offset-4 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        <Info className="h-4 w-4" />
        Ver instrucciones DNS
      </button>

      {showDnsHelp ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          <p className="font-medium">Configura estos registros en tu proveedor DNS:</p>
          <div className="mt-2 rounded-lg bg-white p-3 font-mono text-xs text-blue-900 dark:bg-slate-900 dark:text-blue-200">
            <p>A / ALIAS para dominio raiz -&gt; 76.76.21.21</p>
            <p>CNAME para www -&gt; cname.vercel-dns.com</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
