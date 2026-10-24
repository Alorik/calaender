/** A person in the firm; each has a calendar with its own colour. */
export interface Person {
  id: string;
  name: string;
  initials: string;
  role: string;
  /** Calendar colour: checkbox, avatar text, event stripe. */
  color: string;
  /** Avatar fill (about 16% tint). */
  avatarBg: string;
  /** Event fill (about 15% tint). */
  eventBg: string;
  /** Event left stripe (the colour, or a softer one for your own calendar). */
  stripe: string;
  /** Busy block in the availability strip. */
  busy: string;
}

export interface CaseInfo {
  id: string;
  /** Short name used across the calendar: "Martinez v. Rose". */
  name: string;
  /** Full caption on case cards: "Bezty Martinez v. Rachel Rose". */
  fullName: string;
  /** "PI-2026-0418 · Auto Accident · Litigation". */
  meta: string;
}

export interface Task {
  id: string;
  caseId: string;
  title: string;
}

export type Rsvp = "yes" | "no" | "maybe" | "pending";

/** A guest: someone in the firm (personId) or an outside person. */
export interface Guest {
  personId?: string;
  name?: string;
  role?: string;
  rsvp: Rsvp;
}

export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";
export type Visibility = "firm" | "private";

/**
 * One event. Times are local wall-clock strings: "2026-10-23T09:30" for timed
 * events, "2026-10-23" for all-day ones (end exclusive).
 */
export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  /** Whose calendar it is on (the organizer). */
  ownerId: string;
  guests: Guest[];
  caseId?: string;
  taskId?: string;
  location?: string;
  description?: string;
  videoLink?: string;
  /** Minutes before; null = none. */
  reminder: number | null;
  visibility: Visibility;
  repeat: Repeat;
  /** Deadlines (SOL, filing) show in red. */
  kind?: "deadline";
}

export type ViewType = "timeGridDay" | "timeGridWeek" | "dayGridMonth";
