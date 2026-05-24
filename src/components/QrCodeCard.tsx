'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QrCodeCardProps {
  value: string;
  title: string;
  subtitle?: string;
  size?: number;
}

export default function QrCodeCard({ value, title, subtitle, size = 132 }: QrCodeCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      <div className="mt-3 flex justify-center rounded-lg bg-white p-3">
        <QRCodeSVG value={value} size={size} level="M" includeMargin />
      </div>
    </div>
  );
}
