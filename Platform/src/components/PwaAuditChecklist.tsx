'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

type StatusCheck = {
  label: string;
  pass: boolean;
  detail: string;
};

type UrlStatus = {
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
};

type PwaDebugResponseData = {
  pwaMode: 'GENERATOR' | 'IMPORT';
  pwaModeManual: boolean;
  importedManifestUrl: string | null;
  importedSwUrl: string | null;
  importCandidateDetected: boolean;
  enforceGeneratorScopeChecks?: boolean;
  installability_errors: string[];
  manifestStatus: UrlStatus;
  swUrlStatus: UrlStatus;
  startUrlStatus: UrlStatus | null;
  icon192Status: UrlStatus | null;
  icon512Status: UrlStatus | null;
  serviceWorkerScopeExpected: string;
  wwwRedirectConflict: boolean;
  diagnostics?: {
    hasServiceWorkerAllowedMismatch?: boolean;
    hasStartUrlOutsideScope?: boolean;
    hasStartUrlFetchError?: boolean;
    hasManifestFetchError?: boolean;
    hasServiceWorkerFetchError?: boolean;
    hasMissingOrInvalidIcons?: boolean;
  };
  manifestUrl?: string;
  swUrl?: string;
  scope?: string | null;
  expectedStartUrl?: string | null;
};

interface PwaAuditChecklistProps {
  appId: string;
  customDomain?: string | null;
  appConfigured: boolean;
  appStatus: 'DRAFT' | 'QUEUED' | 'GENERATING' | 'STAGED' | 'PUBLISHED' | 'FAILED';
  showAdvancedDetails?: boolean;
}

function parseApiData(payload: unknown): PwaDebugResponseData | null {
  if (!payload || typeof payload !== 'object') return null;
  const wrapped = payload as { data?: unknown };
  if (!wrapped.data || typeof wrapped.data !== 'object') return null;
  return wrapped.data as PwaDebugResponseData;
}

function getBadge(pass: boolean): { text: string; className: string } {
  if (pass) {
    return {
      text: 'Listo',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    };
  }

  return {
    text: 'Requiere atencion',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };
}

export default function PwaAuditChecklist({
  appId,
  customDomain,
  appConfigured,
  appStatus,
  showAdvancedDetails = true,
}: PwaAuditChecklistProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PwaDebugResponseData | null>(null);
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [isAutoRepairing, setIsAutoRepairing] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (customDomain) {
        params.set('host', customDomain);
      }

      const response = await fetch(`/api/apps/${appId}/pwa-debug?${params.toString()}`, {
        cache: 'no-store',
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error((payload && payload.error) || 'No se pudo verificar el estado de la app');
      }

      const parsed = parseApiData(payload);
      if (!parsed) {
        throw new Error('Respuesta invalida del estado de la app');
      }

      setData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de verificacion');
    } finally {
      setLoading(false);
    }
  }, [appId, customDomain]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const checks = useMemo<StatusCheck[]>(() => {
    if (!data) return [];

    const isImportMode = data.pwaMode === 'IMPORT';

    const hasScopeMismatch = !isImportMode && data.installability_errors.some((item) =>
      item.includes('Service-Worker-Allowed mismatch') || item.includes('outside expected scope')
    );

    return [
      {
        label: 'Archivo de instalacion listo',
        pass: Boolean(data.manifestStatus.ok),
        detail: data.manifestStatus.ok ? 'Correcto' : 'Requiere atencion',
      },
      {
        label: 'Modo app activo',
        pass: Boolean(data.swUrlStatus.ok),
        detail: data.swUrlStatus.ok ? 'Correcto' : 'Requiere atencion',
      },
      {
        label: 'Conexion segura',
        pass: Boolean(data.manifestStatus.ok && data.swUrlStatus.ok),
        detail: data.manifestStatus.ok && data.swUrlStatus.ok ? 'Correcto' : 'Requiere atencion',
      },
      {
        label: 'Icono pequeno listo',
        pass: Boolean(data.icon192Status?.ok),
        detail: data.icon192Status?.ok ? 'Correcto' : 'Requiere atencion',
      },
      {
        label: 'Icono grande listo',
        pass: Boolean(data.icon512Status?.ok),
        detail: data.icon512Status?.ok ? 'Correcto' : 'Requiere atencion',
      },
      {
        label: 'Pantalla inicial lista',
        pass: Boolean(data.startUrlStatus?.ok),
        detail: data.startUrlStatus?.ok ? 'Correcto' : 'Requiere atencion',
      },
      {
        label: 'Navegacion correcta',
        pass: isImportMode ? true : !hasScopeMismatch,
        detail: isImportMode || !hasScopeMismatch ? 'Correcto' : 'Requiere atencion',
      },
    ];
  }, [data]);

  const checklist = useMemo(() => {
    const iconReady = Boolean(data?.icon192Status?.ok && data?.icon512Status?.ok);
    const installReady = Boolean(
      data?.manifestStatus?.ok &&
      data?.swUrlStatus?.ok &&
      data?.startUrlStatus?.ok &&
      checks.find((check) => check.label === 'Navegacion correcta')?.pass
    );

    const navigationReady = Boolean(
      checks.find((check) => check.label === 'Navegacion correcta')?.pass
    );

    return [
      { label: 'App configurada', pass: appConfigured, optional: false },
      { label: 'Iconos listos', pass: iconReady, optional: false },
      { label: 'Instalacion lista', pass: installReady, optional: false },
      { label: 'Vista movil correcta', pass: true, optional: true },
      { label: 'Navegacion correcta', pass: navigationReady, optional: false },
      { label: 'Publicacion lista', pass: appStatus === 'PUBLISHED', optional: false },
    ];
  }, [appConfigured, appStatus, checks, data?.icon192Status?.ok, data?.icon512Status?.ok, data?.manifestStatus?.ok, data?.startUrlStatus?.ok, data?.swUrlStatus?.ok]);

  const hasAttention = checklist.some((item) => !item.optional && !item.pass);

  const autoRepair = async () => {
    if (!data) return;

    const canUseImport =
      data.pwaMode !== 'IMPORT' &&
      (data.importCandidateDetected || Boolean(data.importedManifestUrl && data.importedSwUrl));

    const needsGeneratorNormalization = Boolean(
      data.pwaMode !== 'IMPORT' &&
      data.enforceGeneratorScopeChecks &&
      (
        data.diagnostics?.hasServiceWorkerAllowedMismatch ||
        data.diagnostics?.hasStartUrlOutsideScope ||
        data.diagnostics?.hasStartUrlFetchError
      )
    );

    const needsAssetRegeneration = Boolean(
      data.diagnostics?.hasManifestFetchError ||
      data.diagnostics?.hasServiceWorkerFetchError ||
      data.diagnostics?.hasMissingOrInvalidIcons
    );

    try {
      setFixMessage(null);
      setIsAutoRepairing(true);

      if (canUseImport && (needsGeneratorNormalization || data.wwwRedirectConflict)) {
        const response = await fetch(`/api/apps/${appId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pwaMode: 'IMPORT',
            pwaModeManual: true,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'No se pudo cambiar al modo recomendado');
        setFixMessage('Reparacion aplicada: se uso el modo recomendado para evitar conflictos.');
      } else if (needsAssetRegeneration || needsGeneratorNormalization) {
        const regenerate = await fetch(`/api/apps/${appId}/pwa-regenerate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ forceGenerator: true }),
        });
        const regenPayload = await regenerate.json();
        if (!regenerate.ok) throw new Error(regenPayload?.error || 'No se pudo reparar la configuracion PWA');

        await fetch(`/api/apps/${appId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pwaModeManual: false,
          }),
        });

        setFixMessage('Reparacion aplicada: se corrigieron recursos y configuracion automaticamente.');
      } else {
        const response = await fetch(`/api/apps/${appId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pwaModeManual: false,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'No se pudo activar reparacion automatica');
        setFixMessage('La app ya estaba estable. Se dejo la estrategia automatica activa.');
      }

      await load();
      router.refresh();
    } catch (err) {
      setFixMessage(err instanceof Error ? err.message : 'No se pudo completar la reparacion');
    } finally {
      setIsAutoRepairing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Revisando el estado de tu app...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
        No se pudo cargar el estado: {error}
      </div>
    );
  }

  if (!data) return null;

  const passed = checks.filter((check) => check.pass).length;
  const total = checks.length;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Estado de la App</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {passed}/{total} validaciones en estado listo
        </p>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {checks.map((check) => {
          const badge = getBadge(check.pass);

          return (
            <li key={check.label} className="px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{check.label}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{check.detail}</p>
                </div>

                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                  {badge.text}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-800 dark:bg-gray-950/30">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Checklist visual</h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => {
            const pass = item.pass;
            const badge = item.optional && !pass
              ? {
                  text: 'Opcional',
                  className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                }
              : getBadge(pass);

            return (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                  {badge.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        {hasAttention ? (
          <button
            type="button"
            onClick={autoRepair}
            disabled={isAutoRepairing}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isAutoRepairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            Corregir automaticamente
          </button>
        ) : null}

        {fixMessage ? <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{fixMessage}</p> : null}

        {data.installability_errors.length > 0 ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Se detectaron ajustes tecnicos pendientes. Puedes corregirlos con reparacion automatica.
          </p>
        ) : (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Todo listo para instalar y publicar.
          </p>
        )}
      </div>

      {showAdvancedDetails ? (
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowTechnical((value) => !value)}
            className="text-sm font-medium text-gray-700 underline decoration-dotted underline-offset-4 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            {showTechnical ? 'Ocultar detalles tecnicos' : 'Ver detalles tecnicos'}
          </button>

          {showTechnical ? (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
              <div className="grid gap-2 sm:grid-cols-2">
                <p>manifest_url: {data.manifestUrl || data.manifestStatus.url || 'n/a'}</p>
                <p>service_worker_url: {data.swUrl || data.swUrlStatus.url || 'n/a'}</p>
                <p>scope: {data.scope || data.serviceWorkerScopeExpected || 'n/a'}</p>
                <p>start_url: {data.expectedStartUrl || data.startUrlStatus?.url || 'n/a'}</p>
                <p>modo_pwa: {data.pwaMode}</p>
                <p>http_manifest: {data.manifestStatus.status ?? 'n/a'}</p>
                <p>http_service_worker: {data.swUrlStatus.status ?? 'n/a'}</p>
                <p>http_start_url: {data.startUrlStatus?.status ?? 'n/a'}</p>
                <p>http_icon_192: {data.icon192Status?.status ?? 'n/a'}</p>
                <p>http_icon_512: {data.icon512Status?.status ?? 'n/a'}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
