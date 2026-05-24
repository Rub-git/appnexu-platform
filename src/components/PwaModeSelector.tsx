'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ModeValue = 'AUTO' | 'GENERATOR' | 'IMPORT';

interface PwaModeSelectorProps {
  appId: string;
  currentMode: 'GENERATOR' | 'IMPORT';
  manualOverride: boolean;
}

function resolveCurrentValue(currentMode: 'GENERATOR' | 'IMPORT', manualOverride: boolean): ModeValue {
  if (!manualOverride) return 'AUTO';
  return currentMode;
}

export default function PwaModeSelector({
  appId,
  currentMode,
  manualOverride,
}: PwaModeSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<ModeValue>(resolveCurrentValue(currentMode, manualOverride));

  const saveMode = async () => {
    setError(null);

    const payload =
      value === 'AUTO'
        ? { pwaModeManual: false }
        : { pwaMode: value, pwaModeManual: true };

    try {
      const response = await fetch(`/api/apps/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update PWA mode');
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update PWA mode');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/60">
      <p className="text-xs text-gray-500 dark:text-gray-400">Estrategia PWA</p>
      <div className="mt-2 flex flex-col gap-2">
        <select
          value={value}
          onChange={(event) => setValue(event.target.value as ModeValue)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          disabled={isPending}
        >
          <option value="AUTO">Auto (detectar al publicar)</option>
          <option value="GENERATOR">Forzar Generator</option>
          <option value="IMPORT">Forzar Import</option>
        </select>
        <button
          type="button"
          onClick={saveMode}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {isPending ? 'Guardando...' : 'Guardar modo'}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
        Auto vuelve a analizar manifest/service worker al publicar. Forzado mantiene el modo seleccionado.
      </p>
    </div>
  );
}
