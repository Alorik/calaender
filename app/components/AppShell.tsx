"use client";

import {
  Activity,
  AlarmClock,
  BarChart4,
  Bell,
  Briefcase,
  CalendarDays,
  FileChartPie,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  Phone,
  Search,
  Signature,
  TextSearch,
  User,
  UserStar,
  WalletCards,
} from "lucide-react";

import { cx } from "./ui";

const NAV = [
  { label: "Home", icon: LayoutDashboard },
  { label: "Cases", icon: Briefcase },
  { label: "Case Auditor", icon: FileChartPie },
  { label: "Communication", icon: Phone },
  { label: "Marketing", icon: Megaphone },
  { label: "Leads", icon: UserStar },
  { label: "Activity", icon: Activity },
  { label: "Analytics", icon: BarChart4 },
  { label: "E-Signs", icon: Signature },
  { label: "Payments", icon: WalletCards },
  { label: "Calendar", icon: CalendarDays, active: true },
];

/**
 * The Alphalaw frame around the calendar (Figma "Sidebar" 87px rail + the
 * dark top bar with search). Only Calendar works here; the other entries
 * belong to the main app.
 */
export function AppShell({ onSearch, children }: { onSearch: () => void; children: React.ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 bg-shell">
      <nav aria-label="Main" className="hidden w-[87px] shrink-0 flex-col items-center gap-5 px-2 py-6 md:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/alphalaw-logo.svg" alt="Alphalaw" width={32} height={28} className="h-7 w-8" />
        <ul className="flex w-full flex-1 flex-col gap-2.5 overflow-y-auto">
          {NAV.map(({ label, icon: Icon, active }) => (
            <li key={label}>
              <span
                aria-current={active ? "page" : undefined}
                title={active ? undefined : `${label} (in the main app)`}
                className={cx(
                  "flex flex-col items-center gap-1 rounded-[10px] p-2 text-center text-[10px] leading-tight",
                  active ? "bg-green-ink text-white" : "text-ink-5"
                )}
              >
                <Icon className="size-5" strokeWidth={1.6} />
                <span className="w-full truncate">{label}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-center gap-1.5 text-ink-5">
          <span className="p-4"><AlarmClock className="size-5" strokeWidth={1.6} /></span>
          <span className="relative p-4">
            <Bell className="size-5" strokeWidth={1.6} />
            <span className="absolute right-[15px] top-[15px] size-2 rounded-full bg-now ring-2 ring-shell" />
          </span>
          <span className="rounded-full bg-white/12 p-4 text-white"><User className="size-5" strokeWidth={1.6} /></span>
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-[52px] shrink-0 items-center justify-center px-4">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-9 w-full max-w-[734px] items-center justify-between rounded-xl bg-white/16 px-2.5 text-sm text-white hover:bg-white/20"
          >
            <span className="flex items-center gap-2">
              <Search className="size-5" strokeWidth={1.6} />
              Search anything here...
            </span>
            <TextSearch className="size-5" strokeWidth={1.6} />
          </button>
          <span className="absolute right-4 hidden text-white/80 lg:block"><Newspaper className="size-5" strokeWidth={1.6} /></span>
        </header>
        <main className="mb-2 mr-2 flex min-h-0 flex-1 flex-col gap-2 rounded-2xl bg-canvas p-2 md:rounded-tl-2xl">{children}</main>
      </div>
    </div>
  );
}
