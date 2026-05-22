'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'appnexu.dashboard.listPrefs.v1';

type DashboardListPrefsSyncProps = {
  size: number;
  status: string;
  sort: string;
};

export default function DashboardListPrefsSync({
  size,
  status,
  sort,
}: DashboardListPrefsSyncProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasHydratedFromStorage = useRef(false);

  useEffect(() => {
    if (hasHydratedFromStorage.current) {
      return;
    }
    hasHydratedFromStorage.current = true;

    const hasExplicitPrefs =
      searchParams.has('size') ||
      searchParams.has('status') ||
      searchParams.has('sort') ||
      searchParams.has('cursor') ||
      searchParams.has('stack');

    if (hasExplicitPrefs) {
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { size?: number; status?: string; sort?: string };
      const next = new URLSearchParams(searchParams.toString());

      if (typeof parsed.size === 'number') {
        next.set('size', String(parsed.size));
      }
      if (typeof parsed.status === 'string' && parsed.status.length > 0) {
        next.set('status', parsed.status);
      }
      if (typeof parsed.sort === 'string' && parsed.sort.length > 0) {
        next.set('sort', parsed.sort);
      }

      if (next.toString() !== searchParams.toString()) {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }
    } catch {
      // Ignore malformed local preferences and continue with URL state.
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          size,
          status,
          sort,
        }),
      );
    } catch {
      // Ignore storage errors (private mode/quota) without affecting dashboard usage.
    }
  }, [size, status, sort]);

  return null;
}
