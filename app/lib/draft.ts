import type { CalEvent, Repeat } from "./types";
import { addDays, addMinutes, parseLocal, toDateStr, toDateTimeStr, toTimeStr } from "./dates";
import { newId } from "./store";

/** What the event forms edit. All-day end dates are inclusive here (as Google shows them). */
export interface Draft {
  id?: string;
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  calendarId: string;
  color?: string;
  location: string;
  description: string;
  guests: string[];
  videoLink: string;
  reminder: number | null;
  repeat: Repeat;
}

export function draftFromEvent(event: CalEvent): Draft {
  const start = parseLocal(event.start);
  const end = parseLocal(event.end);
  return {
    id: event.id,
    title: event.title,
    startDate: toDateStr(start),
    startTime: event.allDay ? "09:00" : toTimeStr(start),
    endDate: toDateStr(event.allDay ? addDays(end, -1) : end),
    endTime: event.allDay ? "10:00" : toTimeStr(end),
    allDay: event.allDay,
    calendarId: event.calendarId,
    color: event.color,
    location: event.location ?? "",
    description: event.description ?? "",
    guests: event.guests ?? [],
    videoLink: event.videoLink ?? "",
    reminder: event.reminder ?? null,
    repeat: event.repeat,
  };
}

/** A new event over a selected range (drag on the grid), or the next half hour from now. */
export function newDraft(calendarId: string, start?: Date, end?: Date, allDay = false): Draft {
  let from = start;
  if (!from) {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() < 30 ? 30 : 60);
  }
  const to = end ?? (allDay ? addDays(from, 1) : addMinutes(from, 60));
  return {
    title: "",
    startDate: toDateStr(from),
    startTime: allDay ? "09:00" : toTimeStr(from),
    endDate: toDateStr(allDay ? addDays(to, -1) : to),
    endTime: allDay ? "10:00" : toTimeStr(to),
    allDay,
    calendarId,
    location: "",
    description: "",
    guests: [],
    videoLink: "",
    reminder: allDay ? null : 30,
    repeat: "none",
  };
}

/** Problems that stop saving: the end must be after the start. */
export function draftError(draft: Draft): string | null {
  if (draft.allDay) return draft.endDate < draft.startDate ? "The end date is before the start date." : null;
  const start = `${draft.startDate}T${draft.startTime}`;
  const end = `${draft.endDate}T${draft.endTime}`;
  return end <= start ? "The end time must be after the start time." : null;
}

export function eventFromDraft(draft: Draft): CalEvent {
  return {
    id: draft.id ?? newId(),
    title: draft.title.trim(),
    start: draft.allDay ? draft.startDate : `${draft.startDate}T${draft.startTime}`,
    end: draft.allDay ? toDateStr(addDays(parseLocal(draft.endDate), 1)) : `${draft.endDate}T${draft.endTime}`,
    allDay: draft.allDay,
    calendarId: draft.calendarId,
    color: draft.color,
    location: draft.location.trim() || undefined,
    description: draft.description.trim() || undefined,
    guests: draft.guests.length ? draft.guests : undefined,
    videoLink: draft.videoLink || undefined,
    reminder: draft.reminder,
    repeat: draft.repeat,
  };
}

/** Keeps the length when the start moves (as Google does). */
export function moveStart(draft: Draft, field: "startDate" | "startTime", value: string): Draft {
  if (draft.allDay) {
    const days = Math.round((parseLocal(draft.endDate).getTime() - parseLocal(draft.startDate).getTime()) / 86_400_000);
    const startDate = field === "startDate" ? value : draft.startDate;
    return { ...draft, startDate, endDate: toDateStr(addDays(parseLocal(startDate), Math.max(0, days))) };
  }
  const oldStart = parseLocal(`${draft.startDate}T${draft.startTime}`);
  const oldEnd = parseLocal(`${draft.endDate}T${draft.endTime}`);
  const next = { ...draft, [field]: value };
  const newStart = parseLocal(`${next.startDate}T${next.startTime}`);
  const newEnd = addMinutes(newStart, Math.max(15, (oldEnd.getTime() - oldStart.getTime()) / 60_000));
  const [endDate, endTime] = toDateTimeStr(newEnd).split("T");
  return { ...next, endDate, endTime };
}

/** A made-up video call link (a real app would get one from Google Meet / Zoom). */
export function makeVideoLink() {
  const part = (n: number) => Array.from({ length: n }, () => "abcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random() * 25)]).join("");
  return `https://meet.example.com/${part(3)}-${part(4)}-${part(3)}`;
}

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "No reminder" },
  { value: 0, label: "At the start" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];
