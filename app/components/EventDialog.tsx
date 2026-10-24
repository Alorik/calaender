"use client";

import { useEffect, useState } from "react";

import { TIME_OPTIONS } from "../lib/dates";
import { REMINDER_OPTIONS, draftError, makeVideoLink, moveStart, type Draft } from "../lib/draft";
import { REPEAT_LABELS } from "../lib/fullcalendar";
import { COLORS } from "../lib/store";
import type { CalendarSource, Repeat } from "../lib/types";
import { BellIcon, CalendarIcon, ClockIcon, CloseIcon, PeopleIcon, PinIcon, RepeatIcon, TextIcon, VideoIcon } from "./icons";

const FIELD = "rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The full event form ("More options" / Edit), as in Google Calendar: title,
 * date and time, all day, repeat, guests, video call, location, calendar,
 * colour, reminder and description.
 */
export function EventDialog({
  initial,
  calendars,
  onSave,
  onClose,
}: {
  initial: Draft;
  calendars: CalendarSource[];
  onSave: (draft: Draft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [guest, setGuest] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const error = draftError(draft);
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const calendar = calendars.find((c) => c.id === draft.calendarId);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    setTried(true);
    if (!error) onSave(draft);
  };

  const addGuest = () => {
    const email = guest.trim().replace(/,$/, "");
    if (!email) return;
    if (!EMAIL.test(email)) return setGuestError("Enter a valid email address");
    if (!draft.guests.includes(email)) set({ guests: [...draft.guests, email] });
    setGuest("");
    setGuestError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 sm:p-10" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={draft.id ? "Edit event" : "New event"} className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-2 text-gray-600 hover:bg-gray-100">
            <CloseIcon />
          </button>
          <input
            autoFocus
            value={draft.title}
            onChange={(event) => set({ title: event.target.value })}
            onKeyDown={(event) => event.key === "Enter" && save()}
            placeholder="Add title"
            aria-label="Title"
            className="flex-1 border-b-2 border-transparent px-1 py-1 text-2xl text-gray-900 outline-none focus:border-blue-600"
          />
          <button type="button" onClick={save} className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Save
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          {/* When */}
          <Row icon={<ClockIcon />}>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" aria-label="Start date" value={draft.startDate} onChange={(event) => event.target.value && setDraft(moveStart(draft, "startDate", event.target.value))} className={FIELD} />
              {!draft.allDay && (
                <select aria-label="Start time" value={draft.startTime} onChange={(event) => setDraft(moveStart(draft, "startTime", event.target.value))} className={FIELD}>
                  {TIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              )}
              <span className="text-gray-500">to</span>
              {!draft.allDay && (
                <select aria-label="End time" value={draft.endTime} onChange={(event) => set({ endTime: event.target.value })} className={FIELD}>
                  {TIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              )}
              <input type="date" aria-label="End date" value={draft.endDate} onChange={(event) => event.target.value && set({ endDate: event.target.value })} className={FIELD} />
            </div>
            <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={draft.allDay} onChange={(event) => set({ allDay: event.target.checked })} className="size-4 accent-blue-600" />
              All day
            </label>
            {tried && error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
          </Row>

          <Row icon={<RepeatIcon />}>
            <select aria-label="Repeat" value={draft.repeat} onChange={(event) => set({ repeat: event.target.value as Repeat })} className={FIELD}>
              {(Object.keys(REPEAT_LABELS) as Repeat[]).map((repeat) => <option key={repeat} value={repeat}>{REPEAT_LABELS[repeat]}</option>)}
            </select>
          </Row>

          <Row icon={<PeopleIcon />}>
            <input
              value={guest}
              onChange={(event) => {
                setGuest(event.target.value);
                setGuestError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addGuest();
                }
              }}
              onBlur={addGuest}
              placeholder="Add guests (email, then Enter)"
              aria-label="Add guests"
              className={`${FIELD} w-full`}
            />
            {guestError && <p role="alert" className="mt-1 text-sm text-red-600">{guestError}</p>}
            {draft.guests.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {draft.guests.map((email) => (
                  <li key={email} className="flex items-center gap-3 rounded-md px-1 py-1 text-sm text-gray-800 hover:bg-gray-50">
                    <span className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold uppercase text-blue-800">{email[0]}</span>
                    <span className="flex-1 truncate">{email}</span>
                    <button type="button" aria-label={`Remove ${email}`} onClick={() => set({ guests: draft.guests.filter((g) => g !== email) })} className="text-gray-500 hover:text-gray-800">
                      <CloseIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Row>

          <Row icon={<VideoIcon />}>
            {draft.videoLink ? (
              <div className="flex items-center gap-3 text-sm">
                <a href={draft.videoLink} target="_blank" rel="noreferrer" className="truncate text-blue-700 hover:underline">{draft.videoLink}</a>
                <button type="button" aria-label="Remove video call" onClick={() => set({ videoLink: "" })} className="text-gray-500 hover:text-gray-800">
                  <CloseIcon className="size-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => set({ videoLink: makeVideoLink() })} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Add video call link
              </button>
            )}
          </Row>

          <Row icon={<PinIcon />}>
            <input value={draft.location} onChange={(event) => set({ location: event.target.value })} placeholder="Add location" aria-label="Location" className={`${FIELD} w-full`} />
          </Row>

          <Row icon={<CalendarIcon />}>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Calendar" value={draft.calendarId} onChange={(event) => set({ calendarId: event.target.value })} className={FIELD}>
                {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Event colour">
                <button
                  type="button"
                  role="radio"
                  aria-checked={!draft.color}
                  title={`Calendar colour (${calendar?.name ?? ""})`}
                  onClick={() => set({ color: undefined })}
                  className={`size-6 rounded-full ring-offset-2 ${!draft.color ? "ring-2 ring-gray-500" : ""}`}
                  style={{ background: calendar?.color }}
                />
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    role="radio"
                    aria-checked={draft.color === color.value}
                    aria-label={color.name}
                    title={color.name}
                    onClick={() => set({ color: color.value })}
                    className={`size-5 rounded-full ring-offset-2 ${draft.color === color.value ? "ring-2 ring-gray-500" : ""}`}
                    style={{ background: color.value }}
                  />
                ))}
              </div>
            </div>
          </Row>

          <Row icon={<BellIcon />}>
            <select
              aria-label="Reminder"
              value={draft.reminder === null ? "none" : String(draft.reminder)}
              onChange={(event) => set({ reminder: event.target.value === "none" ? null : Number(event.target.value) })}
              className={FIELD}
            >
              {REMINDER_OPTIONS.map((option) => (
                <option key={option.label} value={option.value === null ? "none" : String(option.value)}>{option.label}</option>
              ))}
            </select>
          </Row>

          <Row icon={<TextIcon />}>
            <textarea value={draft.description} onChange={(event) => set({ description: event.target.value })} placeholder="Add description" aria-label="Description" rows={4} className={`${FIELD} w-full resize-y`} />
          </Row>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="mt-2 text-gray-500">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
