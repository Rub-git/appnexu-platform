'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';

interface PhoneMockupIframeProps {
  src: string;
  title: string;
  themeColor?: string;
  appName: string;
  iconUrl: string;
  showBottomBar?: boolean;
}

export default function PhoneMockupIframe({
  src,
  title,
  themeColor = '#178BFF',
  appName,
  iconUrl,
  showBottomBar = true,
}: PhoneMockupIframeProps) {
  const [failedBySrc, setFailedBySrc] = useState<Record<string, boolean>>({});
  const [loadedBySrc, setLoadedBySrc] = useState<Record<string, boolean>>({});
  const [showSplash, setShowSplash] = useState(true);
  const [simulatedInstall, setSimulatedInstall] = useState(false);
  const failed = failedBySrc[src] ?? false;
  const loaded = loadedBySrc[src] ?? false;

  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setShowSplash(false);
      setSimulatedInstall(true);
    }, 1000);

    const installTimer = window.setTimeout(() => {
      setSimulatedInstall(false);
    }, 2600);

    return () => {
      window.clearTimeout(splashTimer);
      window.clearTimeout(installTimer);
    };
  }, [src]);

  useEffect(() => {
    if (loaded || failed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFailedBySrc((prev) => ({ ...prev, [src]: true }));
    }, 12000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [src, loaded, failed]);

  return (
    <>
      {/* Status bar */}
      <div
        className="h-12 w-full pt-2 text-center text-[10px] font-medium text-white shadow-sm flex items-end justify-center pb-1"
        style={{ backgroundColor: themeColor }}
      >
        <span className="opacity-80">9:41</span>
      </div>

      {/* Content area */}
      <div className="h-[calc(100%-3rem)] w-full bg-white dark:bg-black relative overflow-hidden">
        {showSplash ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-900 to-slate-700 text-white transition-opacity duration-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconUrl} alt={appName} className="h-16 w-16 rounded-2xl object-cover shadow-lg" />
            <p className="text-sm font-semibold">{appName}</p>
            <p className="text-[11px] text-white/70">Cargando experiencia app...</p>
          </div>
        ) : null}

        {/* Iframe — hidden if failed or not yet loaded */}
        {!failed && (
          <iframe
            src={src}
            className={`h-full w-full border-0 transition-all duration-500 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.985]'}`}
            title={title}
            sandbox="allow-scripts allow-same-origin allow-forms"
            onLoad={() => setLoadedBySrc((prev) => ({ ...prev, [src]: true }))}
            onError={() => setFailedBySrc((prev) => ({ ...prev, [src]: true }))}
          />
        )}

        {simulatedInstall ? (
          <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-emerald-600/95 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Simulacion: instalada
            </span>
          </div>
        ) : null}

        {/* Skeleton while loading */}
        {!failed && !loaded && (
          <div className="absolute inset-0 flex flex-col gap-3 p-4">
            <div className="h-6 w-3/4 rounded-md bg-gray-200 animate-pulse dark:bg-gray-700" />
            <div className="h-4 w-full rounded-md bg-gray-100 animate-pulse dark:bg-gray-800" />
            <div className="h-4 w-5/6 rounded-md bg-gray-100 animate-pulse dark:bg-gray-800" />
            <div className="mt-2 h-24 w-full rounded-xl bg-gray-100 animate-pulse dark:bg-gray-800" />
            <div className="h-4 w-full rounded-md bg-gray-100 animate-pulse dark:bg-gray-800" />
            <div className="h-4 w-2/3 rounded-md bg-gray-100 animate-pulse dark:bg-gray-800" />
          </div>
        )}

        {/* Fallback when iframe is blocked by the external site */}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconUrl}
              alt={appName}
              className="h-16 w-16 rounded-2xl object-cover shadow-md ring-1 ring-black/10"
            />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{appName}</p>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 leading-snug px-2">
                Este sitio no permite vista previa embebida.
              </p>
            </div>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: themeColor }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir sitio
            </a>
          </div>
        )}

        {showBottomBar ? (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t border-slate-200 bg-white/95 px-3 py-2 text-[10px] text-slate-500 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
            <span>Inicio</span>
            <span>Explorar</span>
            <span>Perfil</span>
          </div>
        ) : null}
      </div>
    </>
  );
}
