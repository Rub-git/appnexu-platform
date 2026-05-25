'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Loader2, ArrowRight, X, Eye, Sparkles, LayoutTemplate } from 'lucide-react';
import { BackToDashboardButton } from '@/components/BackToDashboardButton';

interface VisualPreset {
  slug: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
  };
  splash: {
    style: string;
    logoScale: string;
  };
  icons: {
    style: string;
    cornerRadius: number;
  };
  bottomNavigation: {
    style: string;
    elevated: boolean;
  };
  animations: {
    level: string;
    pageTransitionMs: number;
  };
  ui: {
    cardRadius: string;
    borderStyle: string;
  };
}

export default function TemplatesPage() {
  const t = useTranslations();
  const router = useRouter();
  const [presets, setPresets] = useState<VisualPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPreset, setPreviewPreset] = useState<VisualPreset | null>(null);

  useEffect(() => {
    fetch('/api/visual-presets')
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setPresets(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUsePreset = (preset: VisualPreset) => {
    sessionStorage.setItem('selectedVisualPreset', JSON.stringify(preset));
    router.push('/dashboard/create');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      {/* Botón fijo de regreso al dashboard, visible siempre */}
      <BackToDashboardButton />
      <div className="bg-gradient-to-br from-[#178BFF] via-[#5B2CCF] to-[#F54291] px-6 py-16 text-center text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-flex items-center rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <LayoutTemplate className="mr-2 h-4 w-4" />
            {t('templates.badge')}
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl" style={{ fontFamily: "'Sora', sans-serif" }}>
            {t('templates.title')}
          </h1>
          <p className="mt-4 text-lg text-white/80">{t('templates.subtitle')}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#178BFF]" />
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => (
              <div
                key={preset.slug}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition-all hover:shadow-lg hover:ring-[#178BFF]/30 dark:bg-gray-900 dark:ring-gray-800 dark:hover:ring-[#178BFF]/40"
              >
                <div
                  className="relative h-32 w-full"
                  style={{
                    background: `linear-gradient(135deg, ${preset.colors.primary}, ${preset.colors.secondary})`,
                  }}
                >
                  <div className="absolute bottom-3 left-3 flex gap-1">
                    <div className="rounded-md bg-white/20 px-2 py-1 text-[10px] font-medium">Splash {preset.splash.style}</div>
                    <div className="rounded-md bg-white/20 px-2 py-1 text-[10px] font-medium">Nav {preset.bottomNavigation.style}</div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{preset.nameEs}</h3>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Preset
                    </span>
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{preset.descriptionEs}</p>

                  <div className="mb-4 flex gap-2">
                    <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: preset.colors.primary }} />
                    <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: preset.colors.secondary }} />
                    <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: preset.colors.background }} />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewPreset(preset)}
                      className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <Eye className="mr-1.5 h-4 w-4" />
                      {t('templates.preview')}
                    </button>
                    <button
                      onClick={() => handleUsePreset(preset)}
                      className="flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-3 py-2 text-sm font-medium text-white transition-all hover:shadow-md hover:shadow-[#178BFF]/25"
                    >
                      {t('templates.useTemplate')}
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && presets.length === 0 && (
          <div className="py-20 text-center text-gray-500">{t('templates.noTemplates')}</div>
        )}

        {previewPreset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPreviewPreset(null)}>
            <div
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
            >
              {/* Botón de regreso permanente al dashboard */}
              <div className="absolute left-4 top-4 z-30">
                <BackToDashboardButton />
              </div>
              {/* Botón de cerrar (X) arriba a la derecha */}
              <button
                onClick={() => setPreviewPreset(null)}
                className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>

              <div
                className="mb-6 rounded-2xl p-6"
                style={{
                  background: `linear-gradient(135deg, ${previewPreset.colors.primary}, ${previewPreset.colors.secondary})`,
                }}
              >
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>{previewPreset.nameEs}</h2>
                <p className="mt-1 text-white/80">{previewPreset.descriptionEs}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Branding AI</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Colores, splash e iconos adaptados automaticamente.</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase text-gray-500">Experiencia visual</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    Navegacion inferior: {previewPreset.bottomNavigation.style}. Animaciones: {previewPreset.animations.level}.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  handleUsePreset(previewPreset);
                  setPreviewPreset(null);
                }}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:shadow-md hover:shadow-[#178BFF]/25"
              >
                <Sparkles className="mr-2 inline h-4 w-4" />
                {t('templates.useTemplate')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
