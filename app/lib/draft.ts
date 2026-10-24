import type { CalEvent, Guest, Repeat, Visibility } from "./types";
import { ME, newId } from "./data";
import { addDays, addMinutes, parseLocal, toDateStr, toDateTimeStr, toTimeStr } from "./dates";

/** What the event forms edit. All-day end dates are inclusive here. */
export interface Draft {
  id?: string;
  title: string;
  date: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  ownerId: string;
  guests: Guest[];
  caseId?: string;
  taskId?: string;
  location: string;
  description: string;
  videoLink: string;
  reminder: number | null;
  visibility: Visibility;
  repeat: Repeat;
  kind?: "deadline";
}

export function draftFromEvent(event: CalEvent): Draft {
  const start = parseLocal(event.start);
  const end = parseLocal(event.end);
  return {
    id: event.id,
    title: event.title,
    date: toDateStr(start),
    startTime: event.allDay ? "09:00" : toTimeStr(start),
    endDate: toDateStr(event.allDay ? addDays(end, -1) : end),
    endTime: event.allDay ? "10:00" : toTimeStr(end),
    allDay: event.allDay,
    ownerId: event.ownerId,
    guests: event.guests,
    caseId: event.caseId,
    taskId: event.taskId,
    location: event.location ?? "",
    description: event.description ?? "",
    videoLink: event.videoLink ?? "",
    reminder: event.reminder,
    visibility: event.visibility,
    repeat: event.repeat,
    kind: event.kind,
  };
}

/** A new event over a dragged range, or the next half hour from now. */
export function newDraft(start?: Date, end?: Date, allDay = false, caseId?: string): Draft {
  let from = start;
  if (!from) {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() < 30 ? 30 : 60);
  }
  const to = end ?? (allDay ? addDays(from, 1) : addMinutes(from, 60));
  return {
    title: "",
    date: toDateStr(from),
    startTime: allDay ? "09:00" : toTimeStr(from),
    endDate: toDateStr(allDay ? addDays(to, -1) : to),
    endTime: allDay ? "10:00" : toTimeStr(to),
    allDay,
    ownerId: ME,
    guests: [],
    caseId,
    location: "",
    description: "",
    videoLink: "",
    reminder: 10,
    visibility: "firm",
    repeat: "none",
  };
}

export const draftStart = (draft: Draft) => parseLocal(draft.allDay ? draft.date : `${draft.date}T${draft.startTime}`);
export const draftEnd = (draft: Draft) =>
  draft.allDay ? addDays(parseLocal(draft.endDate), 1) : parseLocal(`${draft.endDate}T${draft.endTime}`);

/** The end must be after the start. */
export function draftError(draft: Draft): string | null {
  if (draft.allDay) return draft.endDate < draft.date ? "The end date is before the start date." : null;
  return draftEnd(draft) <= draftStart(draft) ? "The end time must be after the start time." : null;
}

export function eventFromDraft(draft: Draft): CalEvent {
  return {
    id: draft.id ?? newId(),
    title: draft.title.trim(),
    start: draft.allDay ? draft.date : `${draft.date}T${draft.startTime}`,
    end: draft.allDay ? toDateStr(addDays(parseLocal(draft.endDate), 1)) : `${draft.endDate}T${draft.endTime}`,
    allDay: draft.allDay,
    ownerId: draft.ownerId,
    guests: draft.guests,
    caseId: draft.caseId,
    taskId: draft.taskId,
    location: draft.location.trim() || undefined,
    description: draft.description.trim() || undefined,
    videoLink: draft.videoLink || undefined,
    reminder: draft.reminder,
    visibility: draft.visibility,
    repeat: draft.repeat,
    kind: draft.kind,
  };
}

/** Moves the start (date or time) and keeps the length, as Google does. */
export function moveDraftStart(draft: Draft, start: Date): Draft {
  const length = Math.max(15, (draftEnd(draft).getTime() - draftStart(draft).getTime()) / 60_000);
  if (draft.allDay) {
    const days = Math.max(1, Math.round(length / 1440));
    return { ...draft, date: toDateStr(start), endDate: toDateStr(addDays(start, days - 1)) };
  }
  const [endDate, endTime] = toDateTimeStr(addMinutes(start, length)).split("T");
  return { ...draft, date: toDateStr(start), startTime: toTimeStr(start), endDate, endTime };
}

/** A made-up Alphalaw Meet link ("meet.alphalaw.com/hs-prep-4821"). */
export function makeMeetLink(title: string) {
  const word = (title.toLowerCase().match(/[a-z]+/g) ?? ["call"]).find((w) => w.length > 2) ?? "call";
  return `meet.alphalaw.com/hs-${word.slice(0, 5)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const REMINDERS: { value: number | null; label: string; short: string }[] = [
  { value: null, label: "No reminder", short: "None" },
  { value: 0, label: "At the start", short: "At start" },
  { value: 5, label: "5 minutes before", short: "5 min before" },
  { value: 10, label: "10 minutes before", short: "10 min before" },
  { value: 30, label: "30 minutes before", short: "30 min before" },
  { value: 60, label: "1 hour before", short: "1 hr before" },
  { value: 1440, label: "1 day before", short: "1 day before" },
];

export const REPEATS: { value: Repeat; label: string }[] = [
  { value: "none", label: "Doesn’t repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Every weekday" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
];
