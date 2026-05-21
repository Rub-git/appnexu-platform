'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface PhoneMockupIframeProps {
  src: string;
  title: string;
  themeColor?: string;
  appName: string;
  iconUrl: string;
}

export default function PhoneMockupIframe({
  src,
  title,
  themeColor = '#178BFF',
  appName,
  iconUrl,
}: PhoneMockupIframeProps) {
  const [failedBySrc, setFailedBySrc] = useState<Record<string, boolean>>({});
  const [loadedBySrc, setLoadedBySrc] = useState<Record<string, boolean>>({});
  const failed = failedBySrc[src] ?? false;
  const loaded = loadedBySrc[src] ?? false;

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
        {/* Iframe — hidden if failed or not yet loaded */}
        {!failed && (
          <iframe
            src={src}
            className={`h-full w-full border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            title={title}
            sandbox="allow-scripts allow-same-origin allow-forms"
            onLoad={() => setLoadedBySrc((prev) => ({ ...prev, [src]: true }))}
            onError={() => setFailedBySrc((prev) => ({ ...prev, [src]: true }))}
          />
        )}

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
      </div>
    </>
  );
}
