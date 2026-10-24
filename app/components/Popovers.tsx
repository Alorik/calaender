"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { formatEventWhen, parseLocal } from "../lib/dates";
import { REMINDER_OPTIONS, type Draft, eventFromDraft } from "../lib/draft";
import { REPEAT_LABELS } from "../lib/fullcalendar";
import type { CalendarSource, CalEvent } from "../lib/types";
import { BellIcon, CalendarIcon, ClockIcon, CloseIcon, CopyIcon, EditIcon, PeopleIcon, PinIcon, TextIcon, TrashIcon, VideoIcon } from "./icons";

export interface Anchor {
  x: number;
  y: number;
}

/** A floating card next to where the user clicked; Esc or a click outside closes it. */
function Floating({ anchor, width, onClose, label, children }: { anchor: Anchor; width: number; onClose: () => void; label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: anchor.x, top: anchor.y });

  // Keep the card on screen.
  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 300;
    const left = Math.min(Math.max(12, anchor.x + 12), window.innerWidth - width - 12);
    const top = Math.min(Math.max(12, anchor.y - 40), window.innerHeight - height - 12);
    setPos({ left, top });
  }, [anchor.x, anchor.y, width]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    // After the click that opened it.
    const timer = window.setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  return (
    <div ref={ref} role="dialog" aria-label={label} className="fixed z-40 rounded-xl bg-white shadow-2xl ring-1 ring-black/10" style={{ ...pos, width }}>
      {children}
    </div>
  );
}

/** Quick add after dragging on the grid: title, calendar, Save or "More options". */
export function QuickCreate({
  anchor,
  draft,
  calendars,
  onChange,
  onSave,
  onMore,
  onClose,
}: {
  anchor: Anchor;
  draft: Draft;
  calendars: CalendarSource[];
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onMore: () => void;
  onClose: () => void;
}) {
  const preview = eventFromDraft(draft);
  return (
    <Floating anchor={anchor} width={400} onClose={onClose} label="Quick add event">
      <div className="flex justify-end px-2 pt-2">
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100">
          <CloseIcon className="size-5" />
        </button>
      </div>
      <div className="flex flex-col gap-4 px-6 pb-4">
        <input
          autoFocus
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          onKeyDown={(event) => event.key === "Enter" && onSave()}
          placeholder="Add title"
          aria-label="Title"
          className="border-b-2 border-gray-200 py-1 text-xl outline-none focus:border-blue-600"
        />
        <p className="flex items-start gap-3 text-sm text-gray-700">
          <ClockIcon className="mt-0.5 size-5 shrink-0 text-gray-500" />
          {formatEventWhen(parseLocal(preview.start), parseLocal(preview.end), preview.allDay)}
        </p>
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <CalendarIcon className="size-5 text-gray-500" />
          <select
            aria-label="Calendar"
            value={draft.calendarId}
            onChange={(event) => onChange({ ...draft, calendarId: event.target.value })}
            className="rounded-md bg-gray-100 px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-600"
          >
            {calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onMore} className="rounded-md px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
            More options
          </button>
          <button type="button" onClick={onSave} className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </Floating>
  );
}

/** Details of a clicked event, with Edit, Duplicate and Delete (as Google's event card). */
export function EventDetails({
  anchor,
  event,
  occurrence,
  calendars,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: {
  anchor: Anchor;
  event: CalEvent;
  /** The clicked occurrence (repeating events show its own date). */
  occurrence: { start: Date; end: Date };
  calendars: CalendarSource[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const calendar = calendars.find((c) => c.id === event.calendarId);
  const color = event.color ?? calendar?.color ?? "#039be5";
  const reminder = REMINDER_OPTIONS.find((option) => option.value === (event.reminder ?? null));
  const action = "rounded-full p-2 text-gray-600 hover:bg-gray-100";
  return (
    <Floating anchor={anchor} width={420} onClose={onClose} label={event.title || "(No title)"}>
      <div className="flex justify-end gap-0.5 px-2 pt-2">
        <button type="button" aria-label="Edit event" title="Edit event" onClick={onEdit} className={action}><EditIcon /></button>
        <button type="button" aria-label="Duplicate" title="Duplicate" onClick={onDuplicate} className={action}><CopyIcon /></button>
        <button type="button" aria-label="Delete event" title="Delete event" onClick={onDelete} className={action}><TrashIcon /></button>
        <button type="button" aria-label="Close" title="Close" onClick={onClose} className={action}><CloseIcon /></button>
      </div>
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-6 pb-5 text-sm text-gray-700">
        <div className="flex gap-4">
          <span className="mt-2 size-3.5 shrink-0 rounded" style={{ background: color }} />
          <div>
            <h2 className="text-[22px] leading-snug text-gray-900">{event.title || "(No title)"}</h2>
            <p>{formatEventWhen(occurrence.start, occurrence.end, event.allDay)}</p>
            {event.repeat !== "none" && <p className="text-gray-500">{REPEAT_LABELS[event.repeat]}</p>}
          </div>
        </div>
        {event.videoLink && (
          <Line icon={<VideoIcon />}>
            <a href={event.videoLink} target="_blank" rel="noreferrer" className="inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
              Join video call
            </a>
            <p className="mt-1 truncate text-xs text-gray-500">{event.videoLink}</p>
          </Line>
        )}
        {event.location && <Line icon={<PinIcon />}>{event.location}</Line>}
        {event.guests && event.guests.length > 0 && (
          <Line icon={<PeopleIcon />}>
            <p>{event.guests.length} guest{event.guests.length > 1 ? "s" : ""}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {event.guests.map((email) => (
                <li key={email} className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold uppercase text-blue-800">{email[0]}</span>
                  {email}
                </li>
              ))}
            </ul>
          </Line>
        )}
        {event.description && <Line icon={<TextIcon />}><p className="whitespace-pre-wrap">{event.description}</p></Line>}
        {reminder && reminder.value !== null && <Line icon={<BellIcon />}>{reminder.label}</Line>}
        <Line icon={<CalendarIcon />}>{calendar?.name ?? "Calendar"}</Line>
      </div>
    </Floating>
  );
}

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="shrink-0 text-gray-500 [&_svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

