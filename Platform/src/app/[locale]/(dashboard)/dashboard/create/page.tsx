'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Link as LinkIcon, Loader2, Smartphone, Globe, LayoutTemplate, X, Crown, ArrowLeft } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import OnboardingWizardBar from '@/components/OnboardingWizardBar';

interface SelectedTemplate {
  id: string;
  name: string;
  slug: string;
  isPremium: boolean;
  configJson: {
    colorScheme: { primary: string; secondary: string };
    navigation: Array<{ label: string; icon: string; path: string }>;
    quickActions: Array<{ label: string; icon: string; action: string }>;
  };
}

export default function CreateAppPage() {
  const t = useTranslations();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  const steps = [
    { id: 1, label: 'Ingresa tu website' },
    { id: 2, label: 'IA analiza tu sitio' },
    { id: 3, label: 'Personaliza tu app' },
    { id: 4, label: 'Vista previa' },
    { id: 5, label: 'Publica' },
  ];

  // Check for template selection from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('selectedTemplate');
      if (stored) {
        setSelectedTemplate(JSON.parse(stored));
        sessionStorage.removeItem('selectedTemplate');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const draftUrl = sessionStorage.getItem('appnexu-wizard-url');
      if (draftUrl) {
        setUrl(draftUrl);
      }
    } catch {
      // ignore autosave read errors
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('appnexu-wizard-url', url);
    } catch {
      // ignore autosave write errors
    }
  }, [url]);

  // Normalize URL: add https:// if missing
  const normalizeUrl = (input: string): string => {
    let trimmed = input.trim();
    if (!trimmed) return trimmed;
    // If it doesn't start with http(s)://, add https://
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) return;

    // Update the URL in the input to show the normalized version
    setUrl(normalizedUrl);
    setIsAnalyzing(true);
    setError('');

    try {
      // First check if user can create more apps
      const limitRes = await fetch('/api/apps/check-limit');

      if (!limitRes.ok) {
        const limitErr = await limitRes.json().catch(() => ({}));
        if (limitRes.status === 503) {
          setError(limitErr.error || 'Error de conexión a la base de datos. Inténtalo de nuevo.');
          setIsAnalyzing(false);
          return;
        }
        if (limitRes.status === 401) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          setIsAnalyzing(false);
          return;
        }
        setError(limitErr.error || 'Error al verificar el límite de apps.');
        setIsAnalyzing(false);
        return;
      }

      const limitData = await limitRes.json();
      const limitInfo = limitData.data || limitData;
      if (!limitInfo.allowed) {
        const planMsg = limitInfo.plan === 'FREE'
          ? `Has alcanzado el límite de ${limitInfo.limit} app(s) en tu plan gratuito. Mejora tu plan para crear más apps.`
          : t('plans.limitReached.title');
        setError(planMsg);
        setIsAnalyzing(false);
        return;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || t('errors.failedToAnalyze'));
      }

      const result = await response.json();
      const analyzeData = result.data || result;

      // Map analyze response fields to generate API schema
      // analyze returns { url, title, description, themeColor, icons: string[] }
      // generate expects { url, title, themeColor, backgroundColor, iconUrls: string, templateSlug }
      // Only forward themeColor if it's a valid hex color (e.g. not rgb(), hsl(), or named colors)
      const rawThemeColor: unknown = analyzeData.themeColor;
      const safeThemeColor =
        typeof rawThemeColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(rawThemeColor.trim())
          ? rawThemeColor.trim()
          : undefined;

      const generateData: Record<string, unknown> = {
        url: analyzeData.url,
        title: analyzeData.title,
        themeColor: safeThemeColor,
        // Convert icons array to comma-separated string for iconUrls field
        // Cap at 4000 chars to stay within the 5000-char DB limit
        iconUrls: Array.isArray(analyzeData.icons) && analyzeData.icons.length > 0
          ? analyzeData.icons.join(',').substring(0, 4000)
          : undefined,
      };

      // Apply template colors if selected
      if (selectedTemplate) {
        generateData.themeColor = selectedTemplate.configJson.colorScheme.primary;
        generateData.backgroundColor = '#ffffff';
        generateData.templateSlug = selectedTemplate.slug;
      }

      // Call generate API to create the DB record
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateData),
      });

      if (!generateResponse.ok) {
        const genResult = await generateResponse.json();
        throw new Error(genResult.error || t('errors.failedToGenerate'));
      }

      const generateResult = await generateResponse.json();

      // Trigger AI analysis in background
      try {
        fetch(`/api/apps/${generateResult.data.id}/analyze`, { method: 'POST' });
      } catch { /* non-blocking */ }

      router.push(`/dashboard/preview/${generateResult.data.id}?wizard=1&step=3`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToGenerate'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <OnboardingWizardBar currentStep={wizardStep} steps={steps} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Creador de Apps con IA
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Flujo guiado para convertir tu website en una PWA profesional.
        </p>
      </div>

      {/* Template Selection Banner */}
      {selectedTemplate ? (
        <div className="mb-6 rounded-xl border-2 border-indigo-200 bg-[#178BFF]/10 p-4 dark:border-indigo-800 dark:bg-[#178BFF]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${selectedTemplate.configJson.colorScheme.primary}, ${selectedTemplate.configJson.colorScheme.secondary})`,
                }}
              />
              <div>
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                  {t('createApp.usingTemplate')}: {selectedTemplate.name}
                  {selectedTemplate.isPremium && (
                    <Crown className="ml-1.5 inline h-3.5 w-3.5 text-amber-500" />
                  )}
                </p>
                <p className="text-xs text-[#178BFF]/70 dark:text-[#178BFF]/70">
                  {t('createApp.templateApplied')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="rounded-full p-1 text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <Link
          href="/templates"
          className="mb-6 flex items-center gap-3 rounded-xl border border-dashed border-[#178BFF]/30 bg-[#178BFF]/5 p-4 transition-colors hover:border-[#178BFF]/40 hover:bg-[#178BFF]/10 dark:border-[#178BFF]/30 dark:bg-[#178BFF]/5 dark:hover:bg-[#178BFF]/10"
        >
          <LayoutTemplate className="h-6 w-6 text-indigo-500" />
          <div>
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
              {t('createApp.browseTemplates')}
            </p>
            <p className="text-xs text-[#178BFF]/70 dark:text-[#178BFF]/70">
              {t('createApp.browseTemplatesDesc')}
            </p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5 text-indigo-400" />
        </Link>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <div className="p-8">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Paso 1: Ingresa tu website
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <LinkIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  name="url"
                  id="url"
                  className="block w-full rounded-md border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-lg sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:placeholder:text-gray-500"
                  placeholder={t('createApp.form.urlPlaceholder')}
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Usaremos esta URL para analizar branding, navegacion e instalabilidad.
              </p>
            </div>

            {wizardStep === 1 ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  disabled={!url.trim()}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Siguiente
                  <ArrowRight className="ml-1 h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
                  <p className="font-semibold">Paso 2: IA analiza tu sitio</p>
                  <p className="mt-1">Analizaremos contenido, color principal, logo, navegacion y estrategia PWA recomendada.</p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </button>

                  <button
                    type="submit"
                    disabled={isAnalyzing || !url}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t('createApp.form.analyzing')}
                      </>
                    ) : (
                      <>
                        Analizar y continuar
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="bg-gray-50 px-8 py-6 dark:bg-gray-800/50">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">
            {t('createApp.steps.title')}
          </h4>
          <ul className="mt-4 space-y-4">
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <Globe className="h-5 w-5 text-gray-400" />
              </div>
              <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                {t('createApp.steps.scan')}
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <Loader2 className="h-5 w-5 text-gray-400" />
              </div>
              <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                {t('createApp.steps.generate')}
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <Smartphone className="h-5 w-5 text-gray-400" />
              </div>
              <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                {t('createApp.steps.preview')}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
