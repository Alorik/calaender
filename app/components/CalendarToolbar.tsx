"use client";

import { useRef, useState } from "react";
import { Briefcase, ChevronDown, ChevronLeft, ChevronRight, Search, Settings, Users, X } from "lucide-react";

import { CASES, ME, PEOPLE } from "../lib/data";
import type { ViewType } from "../lib/types";
import { Avatar, Button, ColorCheckbox, IconButton, Switch, cx, useDismiss } from "./ui";

export interface ToolbarSettings {
  showWeekends: boolean;
  weekStartsMonday: boolean;
}

const VIEWS: { value: ViewType; label: string }[] = [
  { value: "timeGridDay", label: "Day" },
  { value: "timeGridWeek", label: "Week" },
  { value: "dayGridMonth", label: "Month" },
];

/**
 * Figma "Calendar toolbar": title, Today, back / next, the week badge; on the
 * right search, the case filter, the calendars menu, Day / Week / Month and
 * settings.
 */
export function CalendarToolbar({
  title,
  week,
  view,
  caseId,
  caseCounts,
  visible,
  settings,
  searchOpen,
  onToday,
  onPrev,
  onNext,
  onView,
  onCase,
  onToggleCalendar,
  onSettings,
  onSearchOpen,
  search,
}: {
  title: string;
  /** ISO week number in Week view, else null. */
  week: number | null;
  view: ViewType;
  caseId: string | null;
  caseCounts: Record<string, number>;
  visible: Set<string>;
  settings: ToolbarSettings;
  searchOpen: boolean;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onView: (view: ViewType) => void;
  onCase: (caseId: string | null) => void;
  onToggleCalendar: (personId: string) => void;
  onSettings: (settings: ToolbarSettings) => void;
  onSearchOpen: () => void;
  /** The search box, shown in place of the search icon when open. */
  search: React.ReactNode;
}) {
  const selectedCase = CASES.find((item) => item.id === caseId);
  return (
    <section aria-label="Calendar toolbar" className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="mr-3 flex flex-col">
          <span className="text-xs font-medium leading-4 text-ink-3">Calendar</span>
          <h1 className="text-xl font-semibold leading-[26px] text-ink">{title}</h1>
        </div>
        <Button onClick={onToday} title="Today (T)">Today</Button>
        <IconButton aria-label="Previous" title="Previous (K)" onClick={onPrev}>
          <ChevronLeft />
        </IconButton>
        <IconButton aria-label="Next" title="Next (J)" onClick={onNext}>
          <ChevronRight />
        </IconButton>
        {week !== null && <span className="rounded-md bg-chip px-2 py-[3px] text-xs font-medium leading-4 text-ink-2">Week {week}</span>}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {searchOpen ? search : (
          <IconButton aria-label="Search events" title="Search (/)" onClick={onSearchOpen}>
            <Search />
          </IconButton>
        )}

        {selectedCase ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-green-line bg-green-tint pl-2 pr-1 text-sm font-semibold text-green-ink">
            <Briefcase className="size-4" />
            {selectedCase.name}
            <button type="button" aria-label="Clear case filter" onClick={() => onCase(null)} className="rounded-md p-1 hover:bg-green-soft">
              <X className="size-3.5" />
            </button>
          </span>
        ) : (
          <Menu
            label="All cases"
            icon={<Briefcase />}
            render={(close) => (
              <ul className="py-1">
                <MenuItem active onClick={close}>All cases</MenuItem>
                {CASES.map((item) => (
                  <MenuItem
                    key={item.id}
                    onClick={() => {
                      onCase(item.id);
                      close();
                    }}
                    trailing={caseCounts[item.id] ?? 0}
                  >
                    {item.name}
                  </MenuItem>
                ))}
              </ul>
            )}
          />
        )}

        <Menu
          label={`${visible.size} calendar${visible.size === 1 ? "" : "s"}`}
          icon={<Users />}
          render={() => (
            <ul className="w-64 py-1">
              {PEOPLE.map((person) => (
                <li key={person.id} className="flex items-center gap-2.5 px-3 py-1.5">
                  <ColorCheckbox
                    checked={visible.has(person.id)}
                    color={person.color}
                    label={`Show ${person.name}’s calendar`}
                    onChange={() => onToggleCalendar(person.id)}
                  />
                  <Avatar person={person} size={24} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {person.name}
                    {person.id === ME && " (you)"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        />

        <div role="tablist" aria-label="View" className="flex gap-0.5 rounded-[10px] bg-chip p-[3px]">
          {VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={view === option.value}
              title={`${option.label} (${option.label[0]})`}
              onClick={() => onView(option.value)}
              className={cx(
                "rounded-lg px-3.5 py-1.5 text-[13px] leading-[18px]",
                view === option.value ? "bg-[#213f3c] font-semibold text-white" : "font-medium text-ink-2 hover:bg-white/70"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Menu
          iconOnly
          label="Calendar settings"
          icon={<Settings />}
          align="right"
          render={() => (
            <div className="flex w-64 flex-col gap-3 p-4 text-sm text-ink">
              <p className="text-[11px] font-semibold tracking-[0.44px] text-ink-3">SETTINGS</p>
              <label className="flex items-center justify-between gap-3">
                Show weekends
                <Switch checked={settings.showWeekends} label="Show weekends" onChange={(showWeekends) => onSettings({ ...settings, showWeekends })} />
              </label>
              <label className="flex items-center justify-between gap-3">
                Start week on Monday
                <Switch checked={settings.weekStartsMonday} label="Start week on Monday" onChange={(weekStartsMonday) => onSettings({ ...settings, weekStartsMonday })} />
              </label>
              <p className="text-xs leading-4 text-ink-3">Shortcuts: T today · J / K next / back · D / W / M views · C create · / search</p>
            </div>
          )}
        />
      </div>
    </section>
  );
}

function Menu({
  label,
  icon,
  iconOnly,
  align = "left",
  render,
}: {
  label: string;
  icon: React.ReactNode;
  iconOnly?: boolean;
  align?: "left" | "right";
  render: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative">
      {iconOnly ? (
        <IconButton aria-label={label} title={label} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {icon}
        </IconButton>
      ) : (
        <Button aria-expanded={open} onClick={() => setOpen((v) => !v)} className="[&>svg]:size-4">
          {icon}
          {label}
          <ChevronDown className="text-ink-2" />
        </Button>
      )}
      {open && (
        <div className={cx("absolute z-40 mt-1 min-w-56 rounded-xl border border-line bg-white shadow-pop", align === "right" ? "right-0" : "left-0")}>
          {render(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, active, trailing }: { children: React.ReactNode; onClick: () => void; active?: boolean; trailing?: number }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={cx("flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-soft", active ? "font-semibold text-green-ink" : "text-ink")}>
        <span className="flex-1 truncate">{children}</span>
        {trailing !== undefined && <span className="text-[11px] font-medium text-ink-4">{trailing}</span>}
      </button>
    </li>
  );
}
