"use client";

import { useEffect } from "react";

import { formatEventWhen, parseLocal } from "../lib/dates";
import { REPEAT_LABELS } from "../lib/fullcalendar";
import type { CalendarSource, CalEvent } from "../lib/types";
import { CloseIcon } from "./icons";

export interface ToastState {
  id: number;
  message: string;
  /** Shows "Undo" when set. */
  undo?: () => void;
}

/** The dark message at the bottom-left ("Event saved", "Event deleted · Undo"). */
export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <div role="status" className="fixed bottom-6 left-6 z-50 flex min-w-72 items-center gap-4 rounded-md bg-gray-900 py-3 pl-4 pr-2 text-sm text-white shadow-xl">
      <span className="flex-1">{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            onDismiss();
          }}
          className="rounded px-2 py-1 font-medium text-blue-300 hover:bg-white/10"
        >
          Undo
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className="rounded p-1 text-gray-300 hover:bg-white/10">
        <CloseIcon className="size-4" />
      </button>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ["T", "Go to today"],
  ["J / N", "Next period"],
  ["K / P", "Previous period"],
  ["D", "Day view"],
  ["W", "Week view"],
  ["M", "Month view"],
  ["Y", "Year view"],
  ["A", "Schedule view"],
  ["X", "4 days view"],
  ["C", "Create event"],
  ["/", "Search"],
  ["Delete", "Delete the open event"],
  ["E", "Edit the open event"],
  ["Esc", "Close"],
  ["?", "Show shortcuts"],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Keyboard shortcuts</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100">
            <CloseIcon />
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="contents">
              <dt>
                <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-700">{key}</kbd>
              </dt>
              <dd className="text-gray-700">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** Search results: every event whose title, place, notes or guests match, soonest first. */
export function SearchResults({
  query,
  events,
  calendars,
  onOpen,
}: {
  query: string;
  events: CalEvent[];
  calendars: CalendarSource[];
  onOpen: (event: CalEvent) => void;
}) {
  const q = query.trim().toLowerCase();
  const byId = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  const matches = q
    ? events
        .filter((event) =>
          [event.title, event.location, event.description, ...(event.guests ?? [])].some((text) => text?.toLowerCase().includes(q))
        )
        .sort((a, b) => a.start.localeCompare(b.start))
    : [];

  if (!q) return <p className="p-8 text-center text-sm text-gray-500">Type to search events by title, place, notes or guest.</p>;
  if (matches.length === 0) return <p className="p-8 text-center text-sm text-gray-500">No results for “{query}”.</p>;

  return (
    <ul className="divide-y divide-gray-100 overflow-y-auto">
      {matches.map((event) => {
        const color = event.color ?? byId.get(event.calendarId)?.color ?? "#039be5";
        return (
          <li key={event.id}>
            <button type="button" onClick={() => onOpen(event)} className="flex w-full items-start gap-4 px-6 py-3 text-left hover:bg-gray-50">
              <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{event.title || "(No title)"}</span>
                <span className="block text-sm text-gray-600">{formatEventWhen(parseLocal(event.start), parseLocal(event.end), event.allDay)}</span>
                {event.repeat !== "none" && <span className="block text-xs text-gray-500">{REPEAT_LABELS[event.repeat]}</span>}
                {event.location && <span className="block truncate text-xs text-gray-500">{event.location}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
