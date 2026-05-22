'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface AppMiniPreviewProps {
  url: string;
  appName: string;
  themeColor?: string | null;
  iconUrl?: string | null;
  deferUntilVisible?: boolean;
  livePreview?: boolean;
}

export default function AppMiniPreview({
  url,
  appName,
  themeColor,
  iconUrl,
  deferUntilVisible = true,
  livePreview = true,
}: AppMiniPreviewProps) {
  const [blocked, setBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [shouldMountIframe, setShouldMountIframe] = useState(!deferUntilVisible);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!livePreview || !deferUntilVisible || shouldMountIframe) return;

    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setShouldMountIframe(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '160px',
        threshold: 0.05,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [livePreview, deferUntilVisible, shouldMountIframe]);

  if (!livePreview) {
    return (
      <div
        className="relative flex h-32 w-full items-center justify-between overflow-hidden rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        style={{ background: `linear-gradient(125deg, ${themeColor || '#178BFF'}22, #ffffff)` }}
      >
        <div className="flex items-center gap-3">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt={appName} className="h-10 w-10 rounded-lg object-cover ring-1 ring-black/10" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{appName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Preview activa al publicar</p>
          </div>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          Abrir <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  if (blocked) {
    return (
      <div
        className="relative flex h-32 w-full items-center justify-between overflow-hidden rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        style={{ background: `linear-gradient(125deg, ${themeColor || '#178BFF'}22, #ffffff)` }}
      >
        <div className="flex items-center gap-3">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt={appName} className="h-10 w-10 rounded-lg object-cover ring-1 ring-black/10" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{appName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Preview directa no disponible</p>
          </div>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          Abrir <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-32 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="absolute left-0 right-0 top-0 z-10 flex h-7 items-center justify-between border-b border-slate-200 bg-white/90 px-2 text-[10px] text-slate-500 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <span className="truncate">{url}</span>
        <span>{loaded ? 'Online' : shouldMountIframe ? 'Cargando' : 'Preview'}</span>
      </div>
      {shouldMountIframe ? (
        <iframe
          src={url}
          title={`${appName} mini preview`}
          className="h-full w-full border-0 pt-7"
          sandbox="allow-scripts allow-same-origin allow-forms"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setBlocked(true)}
        />
      ) : null}
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {shouldMountIframe ? 'Cargando preview...' : 'Preview diferida para mejor rendimiento'}
          </span>
        </div>
      )}
    </div>
  );
}