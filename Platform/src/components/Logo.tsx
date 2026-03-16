'use client';

import Image from 'next/image';
import { brand } from '@/config/brand';

interface LogoProps {
  /** Show full wordmark logo or just icon */
  variant?: 'full' | 'icon';
  /** Height of the logo in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** For dark backgrounds, invert text color */
  dark?: boolean;
}

/**
 * Appnexu Logo Component
 * Supports full wordmark and icon-only variants.
 * White-label: overrides via brand config.
 */
export default function Logo({ variant = 'full', size = 32, className = '' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={brand.logo.full}
          alt={brand.name}
          width={size}
          height={size}
          className="object-cover"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={brand.logo.full}
          alt={brand.name}
          width={size}
          height={size}
          className="object-cover"
          priority
        />
      </div>
      <span
        className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#178BFF] to-[#5B2CCF] bg-clip-text text-transparent"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {brand.name}
      </span>
    </div>
  );
}
