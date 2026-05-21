'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

type EditableApp = {
  id: string;
  appName: string;
  shortName: string | null;
  themeColor: string | null;
  backgroundColor: string | null;
  iconUrls: string | null;
  importedStartUrl: string | null;
};

interface AppBasicSettingsCardProps {
  app: EditableApp;
}

function normalizeStartPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '/launch';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname || '/launch';
    } catch {
      return '/launch';
    }
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export default function AppBasicSettingsCard({ app }: AppBasicSettingsCardProps) {
  const router = useRouter();

  const [appName, setAppName] = useState(app.appName);
  const [shortName, setShortName] = useState(app.shortName || app.appName.slice(0, 12));
  const [themeColor, setThemeColor] = useState(app.themeColor || '#178BFF');
  const [backgroundColor, setBackgroundColor] = useState(app.backgroundColor || '#ffffff');
  const [iconUrl, setIconUrl] = useState((app.iconUrls || '').split(',').map((item) => item.trim()).filter(Boolean)[0] || '');
  const [startPath, setStartPath] = useState(app.importedStartUrl || '/launch');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAppName(app.appName);
    setShortName(app.shortName || app.appName.slice(0, 12));
    setThemeColor(app.themeColor || '#178BFF');
    setBackgroundColor(app.backgroundColor || '#ffffff');
    setIconUrl((app.iconUrls || '').split(',').map((item) => item.trim()).filter(Boolean)[0] || '');
    setStartPath(app.importedStartUrl || '/launch');
  }, [app]);

  const normalizedStartPath = useMemo(() => normalizeStartPath(startPath), [startPath]);

  const save = async () => {
    setIsSaving(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/apps/${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appName,
          shortName,
          themeColor,
          backgroundColor,
          iconUrls: iconUrl.trim() ? iconUrl.trim() : undefined,
          importedStartUrl: normalizedStartPath,
          importedScope: '/',
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo guardar la configuracion basica');
      }

      setFeedback('Configuracion actualizada.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuracion basica');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configuracion basica</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Ajusta solo lo necesario para personalizar tu app antes de publicar.
        </p>
      </div>

      <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la app</label>
          <input
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre corto</label>
          <input
            value={shortName}
            maxLength={12}
            onChange={(event) => setShortName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Icono</label>
          <input
            value={iconUrl}
            onChange={(event) => setIconUrl(event.target.value)}
            placeholder="https://sitio.com/icono.png"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color principal</label>
          <div className="mt-1 flex items-center gap-2">
            <input type="color" value={themeColor} onChange={(event) => setThemeColor(event.target.value)} className="h-10 w-14 rounded border border-gray-300 dark:border-gray-700" />
            <input
              value={themeColor}
              onChange={(event) => setThemeColor(event.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color de fondo</label>
          <div className="mt-1 flex items-center gap-2">
            <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} className="h-10 w-14 rounded border border-gray-300 dark:border-gray-700" />
            <input
              value={backgroundColor}
              onChange={(event) => setBackgroundColor(event.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pantalla inicial</label>
          <input
            value={startPath}
            onChange={(event) => setStartPath(event.target.value)}
            placeholder="/launch"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Modo de visualizacion</label>
          <select
            value="standalone"
            onChange={() => {}}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="standalone">standalone</option>
          </select>
        </div>
      </div>

      {(feedback || error) ? (
        <div className="px-6 pb-4">
          {feedback ? <p className="text-xs text-emerald-700 dark:text-emerald-300">{feedback}</p> : null}
          {error ? <p className="text-xs text-red-700 dark:text-red-300">{error}</p> : null}
        </div>
      ) : null}

      <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar configuracion
        </button>
      </div>
    </section>
  );
}
