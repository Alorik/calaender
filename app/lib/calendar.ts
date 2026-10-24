import type { CalEvent, Rsvp } from "./types";
import { DEADLINE_STYLE, ME, personById } from "./data";
import { addDays, addMinutes, minutesBetween, parseLocal, sameDay, startOfDay, toDateStr, toDateTimeStr } from "./dates";

/** One occurrence of an event (repeating events have one per day they repeat on). */
export interface Instance {
  /** Unique per occurrence: "<eventId>@<yyyy-MM-dd>". */
  key: string;
  event: CalEvent;
  start: Date;
  end: Date;
}

const repeatsOn = (event: CalEvent, day: Date, first: Date) => {
  if (day < startOfDay(first)) return false;
  switch (event.repeat) {
    case "none":
      return sameDay(day, first);
    case "daily":
      return true;
    case "weekdays":
      return day.getDay() >= 1 && day.getDay() <= 5;
    case "weekly":
      return day.getDay() === first.getDay();
    case "monthly":
      return day.getDate() === first.getDate();
  }
};

/** The occurrences of `events` that touch [from, to). */
export function instancesBetween(events: CalEvent[], from: Date, to: Date): Instance[] {
  const out: Instance[] = [];
  for (const event of events) {
    const first = parseLocal(event.start);
    const firstEnd = parseLocal(event.end);
    if (event.repeat === "none") {
      if (firstEnd > from && first < to) out.push({ key: `${event.id}@${toDateStr(first)}`, event, start: first, end: firstEnd });
      continue;
    }
    const length = firstEnd.getTime() - first.getTime();
    for (let day = startOfDay(from); day < to; day = addDays(day, 1)) {
      if (!repeatsOn(event, day, first)) continue;
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), first.getHours(), first.getMinutes());
      out.push({ key: `${event.id}@${toDateStr(day)}`, event, start, end: new Date(start.getTime() + length) });
    }
  }
  return out;
}

/** Your RSVP when you are a guest (not the organizer). */
export const myRsvp = (event: CalEvent): Rsvp | null =>
  event.ownerId === ME ? null : event.guests.find((guest) => guest.personId === ME)?.rsvp ?? null;

/** Whether `personId` is in the event (organizer or a guest who has not declined). */
export const attends = (event: CalEvent, personId: string) =>
  event.ownerId === personId || event.guests.some((guest) => guest.personId === personId && guest.rsvp !== "no");

/** Someone else's private event: you see "Busy" only. */
export const isHiddenFromMe = (event: CalEvent) =>
  event.visibility === "private" && event.ownerId !== ME && !event.guests.some((guest) => guest.personId === ME);

/** Which calendar an event shows on for you: yours when you are invited, else the organizer's. */
export const shownOnCalendar = (event: CalEvent) => (myRsvp(event) ? ME : event.ownerId);

/** Shown when its calendar is ticked, and (with a case filter) only events of that case. */
export function isShown(event: CalEvent, visible: Set<string>, caseId: string | null) {
  if (caseId && event.caseId !== caseId) return false;
  if (visible.has(shownOnCalendar(event))) return true;
  // Also show invites of teammates you have ticked.
  return event.guests.some((guest) => guest.personId && visible.has(guest.personId));
}

export interface EventLook {
  title: string;
  bg: string;
  stripe: string;
  /** Pending / maybe invites: white with a dashed outline. */
  dashed: boolean;
  /** Declined invites. */
  declined: boolean;
  /** "Pending", "Maybe", "Declined" after the time. */
  status?: string;
  /** Calendar colour (swatch, month dot). */
  color: string;
}

/** Figma "Calendar event": owner colour tint + left stripe; deadlines red; invites dashed until answered. */
export function eventLook(event: CalEvent): EventLook {
  const rsvp = myRsvp(event);
  const person = personById(shownOnCalendar(event)) ?? personById(ME)!;
  const title = isHiddenFromMe(event) ? "Busy" : event.title || "(No title)";
  if (event.kind === "deadline") {
    return { title, bg: DEADLINE_STYLE.bg, stripe: DEADLINE_STYLE.stripe, color: DEADLINE_STYLE.color, dashed: false, declined: false };
  }
  const bg = isHiddenFromMe(event) ? mix(person.eventBg, "#ffffff", 0.4) : person.eventBg;
  return {
    title,
    bg,
    stripe: person.stripe,
    color: person.color,
    dashed: rsvp === "pending" || rsvp === "maybe",
    declined: rsvp === "no",
    status: rsvp === "pending" ? "Pending" : rsvp === "maybe" ? "Maybe" : rsvp === "no" ? "Declined" : undefined,
  };
}

/** Mixes two hex colours (`amount` of b). */
function mix(a: string, b: string, amount: number) {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

// ── free / busy ──────────────────────────────────────────────────────────────

export interface Busy {
  start: Date;
  end: Date;
  /** The event's title, or "Busy" when it is private to someone else. */
  label: string;
}

/** A person's timed events on `day` (repeating ones included), leaving out `excludeId`. */
export function busyOn(events: CalEvent[], personId: string, day: Date, excludeId?: string): Busy[] {
  const from = startOfDay(day);
  return instancesBetween(
    events.filter((event) => !event.allDay && event.id !== excludeId && attends(event, personId)),
    from,
    addDays(from, 1)
  ).map((instance) => ({ start: instance.start, end: instance.end, label: isHiddenFromMe(instance.event) ? "Busy" : instance.event.title }));
}

export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

/** Whether `personId` is busy at [start, end); returns the clashing block. */
export function clash(events: CalEvent[], personId: string, start: Date, end: Date, excludeId?: string): Busy | null {
  return busyOn(events, personId, start, excludeId).find((busy) => overlaps(busy.start, busy.end, start, end)) ?? null;
}

/**
 * Up to `count` times of the same length when everyone is free: working hours
 * (8 AM – 6 PM) on weekdays, from the chosen day on, every 30 minutes.
 */
export function suggestTimes(events: CalEvent[], people: string[], from: Date, minutes: number, excludeId?: string, count = 3) {
  const out: { start: Date; end: Date }[] = [];
  const now = new Date();
  for (let day = startOfDay(from); out.length < count && day < addDays(from, 10); day = addDays(day, 1)) {
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    for (let start = addMinutes(day, 8 * 60); out.length < count; start = addMinutes(start, 30)) {
      const end = addMinutes(start, minutes);
      if (end > addMinutes(day, 18 * 60)) break;
      if (start < now) continue;
      if (people.every((personId) => !clash(events, personId, start, end, excludeId))) out.push({ start, end });
    }
  }
  return out;
}

/** Moves a whole series / event so it starts at `start`, keeping its length. */
export function moveTo(event: CalEvent, start: Date, end?: Date): CalEvent {
  const length = minutesBetween(parseLocal(event.start), parseLocal(event.end));
  const newEnd = end ?? addMinutes(start, length);
  return event.allDay
    ? { ...event, start: toDateStr(start), end: toDateStr(newEnd) }
    : { ...event, start: toDateTimeStr(start), end: toDateTimeStr(newEnd) };
}
