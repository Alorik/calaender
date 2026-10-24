"use client";

import { useState } from "react";

import { COLORS, newId } from "../lib/store";
import type { CalendarSource } from "../lib/types";
import { PlusIcon, TrashIcon } from "./icons";
import { MiniMonth } from "./MiniMonth";

/**
 * Left panel, as in Google Calendar: Create, the small month, and "My
 * calendars" with a coloured checkbox each (untick to hide its events).
 */
export function Sidebar({
  selected,
  rangeStart,
  rangeEnd,
  calendars,
  onCreate,
  onPickDate,
  onCalendarsChange,
}: {
  selected: Date;
  rangeStart: Date;
  rangeEnd: Date;
  calendars: CalendarSource[];
  onCreate: () => void;
  onPickDate: (date: Date) => void;
  onCalendarsChange: (calendars: CalendarSource[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const update = (id: string, patch: Partial<CalendarSource>) =>
    onCalendarsChange(calendars.map((calendar) => (calendar.id === id ? { ...calendar, ...patch } : calendar)));

  const addCalendar = () => {
    if (!name.trim()) return setAdding(false);
    const color = COLORS[(calendars.length * 3) % COLORS.length].value;
    onCalendarsChange([...calendars, { id: newId(), name: name.trim(), color, visible: true }]);
    setName("");
    setAdding(false);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto px-3 pb-6 pt-2">
      <button
        type="button"
        onClick={onCreate}
        className="flex w-fit items-center gap-3 rounded-2xl bg-white py-3.5 pl-4 pr-6 text-sm font-medium text-gray-800 shadow-md ring-1 ring-black/5 transition hover:bg-blue-50 hover:shadow-lg"
      >
        <PlusIcon className="size-6 text-blue-600" />
        Create
      </button>

      <MiniMonth selected={selected} rangeStart={rangeStart} rangeEnd={rangeEnd} onPick={onPickDate} />

      <section aria-label="My calendars" className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between px-2 py-1">
          <h2 className="text-sm font-medium text-gray-800">My calendars</h2>
          <button
            type="button"
            aria-label="Add calendar"
            onClick={() => setAdding(true)}
            className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
        {calendars.map((calendar) => (
          <div key={calendar.id} className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-100">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={calendar.visible}
                onChange={(event) => update(calendar.id, { visible: event.target.checked })}
                className="size-4 cursor-pointer rounded-sm"
                style={{ accentColor: calendar.color }}
              />
              <span className="truncate">{calendar.name}</span>
            </label>
            <label className="relative hidden size-4 cursor-pointer group-hover:block" title="Change colour">
              <span className="block size-4 rounded-full" style={{ background: calendar.color }} />
              <select
                aria-label={`Colour of ${calendar.name}`}
                value={calendar.color}
                onChange={(event) => update(calendar.id, { color: event.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {COLORS.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.name}
                  </option>
                ))}
              </select>
            </label>
            {calendars.length > 1 && (
              <button
                type="button"
                aria-label={`Remove ${calendar.name}`}
                title="Remove calendar"
                onClick={() => onCalendarsChange(calendars.filter((c) => c.id !== calendar.id))}
                className="hidden text-gray-500 hover:text-red-600 group-hover:block"
              >
                <TrashIcon className="size-4" />
              </button>
            )}
          </div>
        ))}
        {adding && (
          <input
            autoFocus
            value={name}
            placeholder="Calendar name"
            onChange={(event) => setName(event.target.value)}
            onBlur={addCalendar}
            onKeyDown={(event) => {
              if (event.key === "Enter") addCalendar();
              if (event.key === "Escape") setAdding(false);
            }}
            className="mx-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-600"
          />
        )}
      </section>
    </aside>
  );
}
