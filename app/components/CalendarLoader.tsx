"use client";

import dynamic from "next/dynamic";

/**
 * The calendar runs only in the browser: it reads the saved events from
 * localStorage and works with the current date and time.
 */
const CalendarApp = dynamic(() => import("./CalendarApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-sm text-gray-500">Loading calendar…</div>
  ),
});

export function CalendarLoader() {
  return <CalendarApp />;
}
