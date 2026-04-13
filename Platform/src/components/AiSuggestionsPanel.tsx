'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles, Loader2, Check, X, RefreshCw, Wand2,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AISuggestions {
  name: string | null;
  navigation: Array<{ label: string; icon: string; path: string }> | null;
  colors: { primary: string; secondary: string } | null;
  actions: Array<{ label: string; icon: string; action: string }> | null;
}

interface AiSuggestionsPanelProps {
  appId: string;
  currentName: string;
  onApplySuggestions: (suggestions: Partial<{
    appName: string;
    themeColor: string;
    backgroundColor: string;
  }>) => void;
}

export default function AiSuggestionsPanel({ appId, currentName, onApplySuggestions }: AiSuggestionsPanelProps) {
  const t = useTranslations();
  const [status, setStatus] = useState<string>('NOT_ANALYZED');
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState('');

  // Fetch existing suggestions on mount
  useEffect(() => {
    fetch(`/api/apps/${appId}/suggestions`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setStatus(d.data.status);
          if (d.data.status === 'COMPLETED') {
            setSuggestions(d.data.suggestions);
          }
        }
      })
      .catch(() => {});
  }, [appId]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/apps/${appId}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.data) {
        setStatus('COMPLETED');
        setSuggestions(data.data.suggestions);
      } else {
        setStatus('FAILED');
        setError(data.error || 'Analysis failed');
      }
    } catch {
      setStatus('FAILED');
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();

  const [isApplying, setIsApplying] = useState(false);

  const handleAcceptAll = async () => {
    if (!suggestions) return;
    setIsApplying(true);
    try {
      const updates: Record<string, string> = {};
      if (suggestions.name) updates.appName = suggestions.name;
      if (suggestions.colors?.primary) updates.themeColor = suggestions.colors.primary;
      await onApplySuggestions(updates);
      router.refresh();
    } finally {
      setIsApplying(false);
    }
  };

  // Not yet analyzed — show trigger button
  if (status === 'NOT_ANALYZED' || status === 'FAILED') {
    return (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-[#178BFF] dark:text-[#178BFF]" />
            <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
              {t('aiAnalyzer.title')}
            </span>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] px-3 py-1.5 text-sm font-medium text-white hover:shadow-md disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t('aiAnalyzer.analyzing')}</>
            ) : (
              <><Sparkles className="mr-1.5 h-4 w-4" /> {t('aiAnalyzer.analyzeButton')}</>
            )}
          </button>
        </div>
        {error && (
          <p className="mt-2 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
        <p className="mt-2 text-xs text-[#178BFF]/70 dark:text-[#178BFF]/70">
          {t('aiAnalyzer.description')}
        </p>
      </div>
    );
  }

  // Analyzing
  if (status === 'ANALYZING' || loading) {
    return (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[#178BFF]" />
          <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
            {t('aiAnalyzer.analyzing')}
          </span>
        </div>
        <p className="mt-2 text-xs text-[#178BFF]/70 dark:text-[#178BFF]/70">
          {t('aiAnalyzer.analyzingDesc')}
        </p>
      </div>
    );
  }

  // Completed — show suggestions
  if (status === 'COMPLETED' && suggestions) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-900 dark:text-green-300">
              {t('aiAnalyzer.suggestionsReady')}
            </span>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-green-600" /> : <ChevronDown className="h-4 w-4 text-green-600" />}
        </button>

        {expanded && (
          <div className="border-t border-green-200 p-4 dark:border-green-800">
            {/* Suggested Name */}
            {suggestions.name && (
              <div className="mb-3">
                <p className="text-xs font-medium uppercase text-green-700 dark:text-green-400">{t('aiAnalyzer.suggestedName')}</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{suggestions.name}</p>
              </div>
            )}

            {/* Suggested Colors */}
            {suggestions.colors && (
              <div className="mb-3">
                <p className="text-xs font-medium uppercase text-green-700 dark:text-green-400">{t('aiAnalyzer.suggestedColors')}</p>
                <div className="mt-1 flex gap-2">
                  <div className="flex items-center gap-1">
                    <div className="h-5 w-5 rounded border" style={{ backgroundColor: suggestions.colors.primary }} />
                    <span className="text-xs text-gray-500">{suggestions.colors.primary}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-5 w-5 rounded border" style={{ backgroundColor: suggestions.colors.secondary }} />
                    <span className="text-xs text-gray-500">{suggestions.colors.secondary}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Navigation */}
            {suggestions.navigation && suggestions.navigation.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium uppercase text-green-700 dark:text-green-400">{t('aiAnalyzer.suggestedNav')}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {suggestions.navigation.map((nav, i) => (
                    <span key={i} className="rounded bg-white px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {nav.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Actions */}
            {suggestions.actions && suggestions.actions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium uppercase text-green-700 dark:text-green-400">{t('aiAnalyzer.suggestedActions')}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {suggestions.actions.map((action, i) => (
                    <span key={i} className="rounded bg-white px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {action.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleAcceptAll}
                disabled={isApplying}
                className="inline-flex items-center rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isApplying ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-4 w-4" />
                )}
                {t('aiAnalyzer.acceptAll')}
              </button>
              <button
                onClick={handleAnalyze}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                {t('aiAnalyzer.reAnalyze')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
