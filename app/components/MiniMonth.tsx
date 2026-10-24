"use client";

import { useState } from "react";

import { addDays, sameDay, startOfDay } from "../lib/dates";
import { ChevronLeft, ChevronRight } from "./icons";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * The small month in the side panel: the visible range is shaded, today is a
 * blue dot, clicking a day opens it in the main calendar.
 */
export function MiniMonth({
  selected,
  rangeStart,
  rangeEnd,
  onPick,
}: {
  /** The day the main calendar is on. */
  selected: Date;
  /** The main calendar's visible range (end exclusive). */
  rangeStart: Date;
  rangeEnd: Date;
  onPick: (date: Date) => void;
}) {
  const [shown, setShown] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  // Follow the main calendar when it moves to another month.
  const [lastSelected, setLastSelected] = useState(selected);
  if (!sameDay(lastSelected, selected)) {
    setLastSelected(selected);
    setShown(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }

  const today = startOfDay(new Date());
  const first = addDays(shown, -shown.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const inRange = (d: Date) => d >= rangeStart && d < rangeEnd;

  return (
    <div className="select-none px-1">
      <div className="mb-1 flex items-center justify-between pl-2">
        <span className="text-sm font-medium text-gray-800">
          {shown.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <div className="flex">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() - 1, 1))}
            className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() + 1, 1))}
            className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-500">
        {WEEKDAYS.map((day, i) => (
          <span key={i} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center text-[11px]">
        {days.map((d) => {
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selected);
          const outside = d.getMonth() !== shown.getMonth();
          return (
            <div key={d.toISOString()} className={inRange(d) ? "bg-blue-50 first:rounded-l-full" : undefined}>
              <button
                type="button"
                onClick={() => onPick(d)}
                aria-label={d.toDateString()}
                aria-current={isToday ? "date" : undefined}
                className={[
                  "mx-auto flex size-7 items-center justify-center rounded-full",
                  isToday ? "bg-blue-600 font-semibold text-white" : isSelected ? "bg-blue-100 font-semibold text-blue-800" : "hover:bg-gray-100",
                  !isToday && outside ? "text-gray-400" : !isToday ? "text-gray-800" : "",
                ].join(" ")}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
