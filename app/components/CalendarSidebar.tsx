"use client";

import { useState } from "react";
import { Briefcase, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { CASES, ME, PEOPLE } from "../lib/data";
import { addDays, sameDay, startOfDay } from "../lib/dates";
import type { Person } from "../lib/types";
import { Avatar, ColorCheckbox, cx } from "./ui";

/**
 * Figma "Calendar sidebar": Create event, the small month, My calendar, Team
 * calendars (search, Show all, "Only" on hover) and the Cases filter.
 */
export function CalendarSidebar({
  selected,
  highlight,
  weekStartsMonday,
  visible,
  caseId,
  caseCounts,
  onCreate,
  onPickDate,
  onToggleCalendar,
  onOnly,
  onShowAll,
  onCase,
}: {
  /** The main calendar's date. */
  selected: Date;
  /** Days shaded in the small month (the visible week), or null. */
  highlight: { start: Date; end: Date } | null;
  weekStartsMonday: boolean;
  visible: Set<string>;
  caseId: string | null;
  caseCounts: Record<string, number>;
  onCreate: () => void;
  onPickDate: (date: Date) => void;
  onToggleCalendar: (personId: string) => void;
  onOnly: (personId: string) => void;
  onShowAll: () => void;
  onCase: (caseId: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const me = PEOPLE.find((person) => person.id === ME)!;
  const team = PEOPLE.filter((person) => person.id !== ME).filter((person) =>
    `${person.name} ${person.role}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <aside aria-label="Calendars" className="hidden w-[280px] shrink-0 flex-col gap-[18px] overflow-y-auto rounded-xl bg-white p-4 lg:flex">
      <button
        type="button"
        onClick={onCreate}
        title="Create event (C)"
        className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] bg-brand px-2.5 text-sm font-medium text-white hover:bg-[#0b3a35]"
      >
        <Plus className="size-5" strokeWidth={1.8} />
        Create event
      </button>

      <MiniMonth selected={selected} highlight={highlight} weekStartsMonday={weekStartsMonday} onPick={onPickDate} />

      <hr className="border-line" />

      <section aria-label="My calendar" className="flex flex-col gap-0.5">
        <h2 className="px-2 pb-1.5 text-[11px] font-semibold leading-[14px] tracking-[0.44px] text-ink-3">MY CALENDAR</h2>
        <CalendarRow person={me} you checked={visible.has(ME)} onToggle={() => onToggleCalendar(ME)} onOnly={() => onOnly(ME)} />
      </section>

      <section aria-label="Team calendars" className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 px-2 pb-1.5">
          <h2 className="flex-1 text-[11px] font-semibold leading-[14px] tracking-[0.44px] text-ink-3">TEAM CALENDARS</h2>
          <button type="button" onClick={onShowAll} className="text-xs font-medium text-green-link hover:underline">
            Show all
          </button>
        </div>
        <label className="mb-1 flex items-center gap-2 rounded-lg border border-line-2 bg-field px-2.5 py-[7px] focus-within:border-green">
          <Search className="size-3.5 text-ink-3" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people in your firm"
            aria-label="Search people in your firm"
            className="min-w-0 flex-1 bg-transparent text-xs leading-4 text-ink outline-none placeholder:text-ink-3"
          />
        </label>
        {team.map((person) => (
          <CalendarRow
            key={person.id}
            person={person}
            checked={visible.has(person.id)}
            onToggle={() => onToggleCalendar(person.id)}
            onOnly={() => onOnly(person.id)}
          />
        ))}
        {team.length === 0 && <p className="px-2 py-2 text-xs text-ink-3">No one matches “{query}”.</p>}
      </section>

      <hr className="border-line" />

      <section aria-label="Cases" className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 px-2 pb-1.5">
          <h2 className="flex-1 text-[11px] font-semibold leading-[14px] tracking-[0.44px] text-ink-3">CASES</h2>
          {caseId && (
            <button type="button" onClick={() => onCase(null)} className="text-xs font-medium text-green-link hover:underline">
              Clear
            </button>
          )}
        </div>
        {CASES.map((item) => {
          const active = item.id === caseId;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onCase(active ? null : item.id)}
              className={cx(
                "flex h-8 items-center gap-2 rounded-lg px-2 text-left text-sm",
                active ? "bg-green-tint font-semibold text-green-ink" : "text-ink hover:bg-soft"
              )}
            >
              <Briefcase className={cx("size-3.5 shrink-0", active ? "text-green-ink" : "text-ink-3")} />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="text-[11px] font-medium text-ink-4">{caseCounts[item.id] ?? 0}</span>
            </button>
          );
        })}
      </section>
    </aside>
  );
}

/** Figma "Team calendar row": checkbox in the person's colour, avatar, name and role; "Only" on hover. */
function CalendarRow({ person, you, checked, onToggle, onOnly }: { person: Person; you?: boolean; checked: boolean; onToggle: () => void; onOnly: () => void }) {
  return (
    <div className="group flex h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-soft">
      <ColorCheckbox checked={checked} color={person.color} label={`Show ${person.name}’s calendar`} onChange={onToggle} />
      <Avatar person={person} size={28} />
      <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 flex-col text-left">
        <span className={cx("truncate text-sm font-medium leading-[18px]", checked ? "text-ink" : "text-ink-2")}>
          {person.name}
          {you && " (you)"}
        </span>
        <span className="truncate text-xs leading-[14px] text-ink-3">{person.role}</span>
      </button>
      <button
        type="button"
        onClick={onOnly}
        title={`Show only ${person.name}`}
        className="hidden rounded-md px-1.5 py-0.5 text-xs font-medium text-green-link hover:bg-green-tint group-hover:block group-focus-within:block"
      >
        Only
      </button>
    </div>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Figma "Mini month": the visible week shaded green, today in a green circle. */
function MiniMonth({
  selected,
  highlight,
  weekStartsMonday,
  onPick,
}: {
  selected: Date;
  highlight: { start: Date; end: Date } | null;
  weekStartsMonday: boolean;
  onPick: (date: Date) => void;
}) {
  const [shown, setShown] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  // Follow the main calendar when it moves to another month.
  const [lastSelected, setLastSelected] = useState(selected);
  if (!sameDay(lastSelected, selected)) {
    setLastSelected(selected);
    setShown(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }

  const firstDay = weekStartsMonday ? 1 : 0;
  const today = startOfDay(new Date());
  const gridStart = addDays(shown, -((shown.getDay() - firstDay + 7) % 7));
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d)));
  // Drop a trailing week that is all next month.
  const rows = weeks.filter((week, i) => i < 5 || week[0].getMonth() === shown.getMonth());
  const labels = weekStartsMonday ? [...WEEKDAYS.slice(1), WEEKDAYS[0]] : WEEKDAYS;
  const inRange = (d: Date) => !!highlight && d >= highlight.start && d < highlight.end;

  return (
    <div className="flex flex-col gap-1 select-none">
      <div className="flex items-center gap-1 pl-1">
        <span className="flex-1 text-sm font-semibold leading-5 text-ink">
          {shown.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button type="button" aria-label="Previous month" onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() - 1, 1))} className="rounded p-0.5 text-ink hover:bg-chip">
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" aria-label="Next month" onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() + 1, 1))} className="rounded p-0.5 text-ink hover:bg-chip">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7">
        {labels.map((label, i) => (
          <span key={i} className="flex h-[30px] items-center justify-center text-[11px] font-medium text-ink-3">
            {label}
          </span>
        ))}
      </div>
      {rows.map((week) => {
        const shaded = week.some(inRange);
        return (
          <div key={week[0].toISOString()} className={cx("grid grid-cols-7 rounded-lg", shaded && "bg-green-tint")}>
            {week.map((d) => {
              const isToday = sameDay(d, today);
              const outside = d.getMonth() !== shown.getMonth();
              const picked = sameDay(d, selected) && !highlight;
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => onPick(d)}
                  aria-label={d.toDateString()}
                  aria-current={isToday ? "date" : undefined}
                  className="flex h-[30px] items-center justify-center"
                >
                  <span
                    className={cx(
                      "flex size-[26px] items-center justify-center rounded-full text-xs leading-4",
                      isToday
                        ? "bg-green font-semibold text-white"
                        : picked
                          ? "bg-green-soft font-semibold text-green-ink"
                          : inRange(d)
                            ? "font-medium text-green-ink hover:bg-green-soft"
                            : outside
                              ? "text-ink-5 hover:bg-chip"
                              : "text-ink-2 hover:bg-chip"
                    )}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
