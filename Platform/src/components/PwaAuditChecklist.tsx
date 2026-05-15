'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
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
  appId: string;
  pwaMode: 'GENERATOR' | 'IMPORT';
  pwaModeManual: boolean;
  importedManifestUrl: string | null;
  importedSwUrl: string | null;
  importedIconsValid: boolean | null;
  importCandidateDetected: boolean;
  useRootDomainAudit: boolean;
  installability_errors: string[];
  manifestStatus: UrlStatus;
  swUrlStatus: UrlStatus;
  startUrlStatus: UrlStatus | null;
  icon192Status: UrlStatus | null;
  icon512Status: UrlStatus | null;
  swAllowedHeader: string | null;
  serviceWorkerScopeExpected: string;
  domainVariantApex: {
    ok: boolean;
    status: number | null;
    finalHost: string | null;
  } | null;
  domainVariantWww: {
    ok: boolean;
    status: number | null;
    finalHost: string | null;
  } | null;
  wwwRedirectConflict: boolean;
  diagnostics?: {
    hasServiceWorkerAllowedMismatch?: boolean;
    hasStartUrlOutsideScope?: boolean;
    hasStartUrlFetchError?: boolean;
    hasManifestFetchError?: boolean;
    hasServiceWorkerFetchError?: boolean;
    hasMissingOrInvalidIcons?: boolean;
  };
};

interface PwaAuditChecklistProps {
  appId: string;
  customDomain?: string | null;
}

function parseApiData(payload: unknown): PwaDebugResponseData | null {
  if (!payload || typeof payload !== 'object') return null;
  const wrapped = payload as { data?: unknown };
  if (!wrapped.data || typeof wrapped.data !== 'object') return null;
  return wrapped.data as PwaDebugResponseData;
}

export default function PwaAuditChecklist({ appId, customDomain }: PwaAuditChecklistProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PwaDebugResponseData | null>(null);
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
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
          throw new Error((payload && payload.error) || 'No se pudo auditar la PWA');
        }

        const parsed = parseApiData(payload);
        if (!parsed) {
          throw new Error('Respuesta inválida del endpoint de auditoría');
        }

        if (active) {
          setData(parsed);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error de auditoría');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load().catch(() => {});

    return () => {
      active = false;
    };
  }, [appId, customDomain]);

  const checks = useMemo<StatusCheck[]>(() => {
    if (!data) return [];

    const hasScopeMismatch = data.installability_errors.some((item) =>
      item.includes('Service-Worker-Allowed mismatch') || item.includes('outside expected scope')
    );

    const httpsCheck: StatusCheck = {
      label: 'HTTPS operativo',
      pass: Boolean(data.manifestStatus.ok && data.swUrlStatus.ok),
      detail: data.useRootDomainAudit
        ? 'Validado en raíz del dominio custom'
        : 'Validado en scope /pwa/{id}/',
    };

    const manifestCheck: StatusCheck = {
      label: 'Manifest accesible',
      pass: Boolean(data.manifestStatus.ok),
      detail: data.manifestStatus.ok
        ? `HTTP ${data.manifestStatus.status}`
        : `Error ${data.manifestStatus.status ?? 'de red'}`,
    };

    const swCheck: StatusCheck = {
      label: 'Service worker accesible',
      pass: Boolean(data.swUrlStatus.ok),
      detail: data.swUrlStatus.ok
        ? `HTTP ${data.swUrlStatus.status}`
        : `Error ${data.swUrlStatus.status ?? 'de red'}`,
    };

    const icon192Check: StatusCheck = {
      label: 'Ícono 192x192 válido',
      pass: Boolean(data.icon192Status?.ok),
      detail: data.icon192Status
        ? (data.icon192Status.ok ? `HTTP ${data.icon192Status.status}` : `Error ${data.icon192Status.status ?? 'de red'}`)
        : 'No detectado',
    };

    const icon512Check: StatusCheck = {
      label: 'Ícono 512x512 válido',
      pass: Boolean(data.icon512Status?.ok),
      detail: data.icon512Status
        ? (data.icon512Status.ok ? `HTTP ${data.icon512Status.status}` : `Error ${data.icon512Status.status ?? 'de red'}`)
        : 'No detectado',
    };

    const startUrlCheck: StatusCheck = {
      label: 'start_url resolvible',
      pass: Boolean(data.startUrlStatus?.ok),
      detail: data.startUrlStatus
        ? (data.startUrlStatus.ok ? `HTTP ${data.startUrlStatus.status}` : `Error ${data.startUrlStatus.status ?? 'de red'}`)
        : 'No detectado',
    };

    const scopeCheck: StatusCheck = {
      label: 'scope/start_url sin conflicto',
      pass: !hasScopeMismatch,
      detail: hasScopeMismatch
        ? 'Hay conflicto de scope o Service-Worker-Allowed'
        : `Scope esperado: ${data.serviceWorkerScopeExpected}`,
    };

    const wwwCheck: StatusCheck = {
      label: 'Sin conflicto www/non-www',
      pass: !data.wwwRedirectConflict,
      detail: data.domainVariantApex && data.domainVariantWww
        ? `Apex -> ${data.domainVariantApex.finalHost || 'n/a'} | WWW -> ${data.domainVariantWww.finalHost || 'n/a'}`
        : 'No aplica (sin dominio custom)',
    };

    return [
      httpsCheck,
      manifestCheck,
      swCheck,
      icon192Check,
      icon512Check,
      startUrlCheck,
      scopeCheck,
      wwwCheck,
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Auditando installabilidad PWA...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
        Error de auditoría: {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const canForceImport =
    data.importCandidateDetected ||
    Boolean(data.importedManifestUrl && data.importedSwUrl);

  const needsGeneratorNormalization = Boolean(
    data.diagnostics?.hasServiceWorkerAllowedMismatch ||
    data.diagnostics?.hasStartUrlOutsideScope ||
    data.diagnostics?.hasStartUrlFetchError
  );

  const needsAssetRegeneration = Boolean(
    data.diagnostics?.hasManifestFetchError ||
    data.diagnostics?.hasServiceWorkerFetchError ||
    data.diagnostics?.hasMissingOrInvalidIcons
  );

  const applyFix = async (mode: 'GENERATOR' | 'IMPORT') => {
    try {
      setFixMessage(null);
      setIsApplyingFix(true);

      const response = await fetch(`/api/apps/${appId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pwaMode: mode,
          pwaModeManual: true,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo aplicar el fix');
      }

      setFixMessage(
        mode === 'GENERATOR'
          ? 'Fix aplicado: modo GENERATOR manual.'
          : 'Fix aplicado: modo IMPORT manual.'
      );
      router.refresh();
    } catch (err) {
      setFixMessage(err instanceof Error ? err.message : 'Error al aplicar fix');
    } finally {
      setIsApplyingFix(false);
    }
  };

  const applyAutoDetect = async () => {
    try {
      setFixMessage(null);
      setIsApplyingFix(true);

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
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo activar modo AUTO');
      }

      setFixMessage('Fix aplicado: modo AUTO (deteccion en publish).');
      router.refresh();
    } catch (err) {
      setFixMessage(err instanceof Error ? err.message : 'Error al activar modo AUTO');
    } finally {
      setIsApplyingFix(false);
    }
  };

  const passed = checks.filter((check) => check.pass).length;
  const total = checks.length;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Auditoría PWA</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {passed}/{total} checks aprobados · Modo {data.pwaMode} ({data.pwaModeManual ? 'manual' : 'auto'})
        </p>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {checks.map((check) => (
          <li key={check.label} className="px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{check.label}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{check.detail}</p>
              </div>
              <span className={check.pass ? 'text-emerald-600' : 'text-amber-600'}>
                {check.pass ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {data.installability_errors.length > 0 ? (
        <div className="border-t border-amber-200 bg-amber-50 px-6 py-4 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Issues detectados</p>
          <div className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
            {data.installability_errors.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>

          <div className="mt-3 space-y-2 text-xs text-amber-800 dark:text-amber-200">
            {needsGeneratorNormalization ? (
              <p>
                Sugerencia: hay conflicto de <strong>scope/start_url/SW-Allowed</strong>. Recomendado aplicar <strong>Fix 1</strong> para normalizar Generator.
              </p>
            ) : null}
            {canForceImport ? (
              <p>
                Sugerencia: se detecta PWA existente. Puedes aplicar <strong>Fix 2</strong> para gestionarla como Import sin doble wrapper.
              </p>
            ) : null}
            {needsAssetRegeneration ? (
              <p>
                Sugerencia: faltan assets PWA (manifest/sw/iconos). Activa <strong>AUTO</strong> para redetectar al publicar o fuerza Generator.
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyFix('GENERATOR')}
              disabled={isApplyingFix}
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Fix 1: Normalizar a Generator
            </button>
            <button
              type="button"
              onClick={() => applyFix('IMPORT')}
              disabled={isApplyingFix || !canForceImport}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Fix 2: Cambiar a Import
            </button>
            <button
              type="button"
              onClick={applyAutoDetect}
              disabled={isApplyingFix}
              className="inline-flex items-center rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Auto-fix: Activar AUTO
            </button>
          </div>

          {fixMessage ? (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{fixMessage}</p>
          ) : null}
        </div>
      ) : null}

      {data.wwwRedirectConflict ? (
        <div className="border-t border-red-200 bg-red-50 px-6 py-4 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-xs font-semibold text-red-800 dark:text-red-300">
            Fix 3: Conflicto www/non-www detectado
          </p>
          <div className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-300">
            <p>- Define un canónico único (recomendado: apex sin www o solo www).</p>
            <p>- Configura redirect 301 del host secundario al canónico.</p>
            <p>- Mantén manifest/scope/start_url en el mismo host canónico.</p>
            <p>
              - Verificado: apex -&gt; {data.domainVariantApex?.finalHost || 'n/a'} | www -&gt; {data.domainVariantWww?.finalHost || 'n/a'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
