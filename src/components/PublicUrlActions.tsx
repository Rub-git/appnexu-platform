'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Share2 } from 'lucide-react';

interface PublicUrlActionsProps {
  publicUrl: string;
}

export default function PublicUrlActions({ publicUrl }: PublicUrlActionsProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Mi app',
          url: publicUrl,
        });
        return;
      }
      await copy();
    } catch {
      // no-op
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? 'Copiado' : 'Copiar enlace'}
      </button>

      <a
        href={publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Abrir app
      </a>

      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <Share2 className="h-3.5 w-3.5" />
        Compartir
      </button>
    </div>
  );
}
