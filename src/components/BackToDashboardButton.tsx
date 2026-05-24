"use client";

import { useRouter } from "next/navigation";

export function BackToDashboardButton() {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Detect locale from path for fallback
      const locale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "es";
      router.push(`/${locale}/dashboard`);
    }
  };

  return (
    <button
      onClick={goBack}
      className="fixed left-2 top-0 z-[2147483647] flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg border border-gray-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        left: 8,
        maxWidth: '90vw',
        pointerEvents: 'auto',
      }}
      aria-label="Volver al dashboard"
      tabIndex={0}
    >
      <span style={{fontSize: 22, lineHeight: 1, marginRight: 4}}>←</span>
      <span className="hidden sm:inline">Dashboard</span>
    </button>
  );
}
