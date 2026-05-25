"use client";

import { useRouter } from "next/navigation";

export function BackToDashboardButton() {
  const router = useRouter();

  // Detect locale from path
  let locale = "";
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/es")) locale = "es";
    else if (path.startsWith("/en")) locale = "en";
  }

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      const dashboardHref = locale ? `/${locale}/dashboard` : "/dashboard";
      router.push(dashboardHref);
    }
  };

  let label = null;
  if (locale === "es") label = "Atrás";
  else if (locale === "en") label = "Back";

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
      aria-label={label ? label : "Back"}
      tabIndex={0}
    >
      <span style={{fontSize: 22, lineHeight: 1, marginRight: label ? 4 : 0}}>←</span>
      {label && <span>{label}</span>}
    </button>
  );
}
