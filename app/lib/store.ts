import type { CalendarSource, CalEvent } from "./types";
import { addDays, toDateStr } from "./dates";

/** Google Calendar's palette (Tomato … Graphite). */
export const COLORS = [
  { name: "Tomato", value: "#d50000" },
  { name: "Flamingo", value: "#e67c73" },
  { name: "Tangerine", value: "#f4511e" },
  { name: "Banana", value: "#f6bf26" },
  { name: "Sage", value: "#33b679" },
  { name: "Basil", value: "#0b8043" },
  { name: "Peacock", value: "#039be5" },
  { name: "Blueberry", value: "#3f51b5" },
  { name: "Lavender", value: "#7986cb" },
  { name: "Grape", value: "#8e24aa" },
  { name: "Graphite", value: "#616161" },
];

export const DEFAULT_CALENDARS: CalendarSource[] = [
  { id: "personal", name: "Personal", color: "#039be5", visible: true },
  { id: "work", name: "Work", color: "#0b8043", visible: true },
  { id: "family", name: "Family", color: "#8e24aa", visible: true },
  { id: "holidays", name: "Holidays", color: "#f6bf26", visible: true },
];

export const newId = () => Math.random().toString(36).slice(2, 10);

/** A week of example events around today, so the calendar is not empty on first open. */
export function sampleEvents(today = new Date()): CalEvent[] {
  const day = (offset: number) => toDateStr(addDays(today, offset));
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const weekDay = (index: number) => toDateStr(addDays(monday, index));
  return [
    { id: newId(), title: "Team stand-up", start: `${weekDay(0)}T09:00`, end: `${weekDay(0)}T09:15`, allDay: false, calendarId: "work", repeat: "weekdays", videoLink: "https://meet.example.com/abc-defg-hij", reminder: 10 },
    { id: newId(), title: "Deposition prep", start: `${day(0)}T10:00`, end: `${day(0)}T11:30`, allDay: false, calendarId: "work", location: "Conference room B", description: "Go through the client's statements and exhibits.", guests: ["megan@example.com", "chandler@example.com"], repeat: "none", reminder: 30 },
    { id: newId(), title: "Lunch with Sam", start: `${day(0)}T12:30`, end: `${day(0)}T13:30`, allDay: false, calendarId: "personal", location: "Blue Bottle Café", repeat: "none", reminder: null },
    { id: newId(), title: "Client call: Martinez", start: `${day(1)}T11:00`, end: `${day(1)}T12:00`, allDay: false, calendarId: "work", repeat: "none", videoLink: "https://meet.example.com/xyz-abcd-efg", reminder: 10 },
    { id: newId(), title: "Gym", start: `${day(1)}T18:00`, end: `${day(1)}T19:00`, allDay: false, calendarId: "personal", repeat: "none", reminder: null },
    { id: newId(), title: "Demand letter review", start: `${day(2)}T14:00`, end: `${day(2)}T15:00`, allDay: false, calendarId: "work", repeat: "none", reminder: 10 },
    { id: newId(), title: "SOL deadline: Whitfield", start: day(3), end: day(4), allDay: true, calendarId: "work", color: "#d50000", repeat: "none", reminder: null },
    { id: newId(), title: "Mom's birthday", start: day(5), end: day(6), allDay: true, calendarId: "family", repeat: "yearly", reminder: null },
    { id: newId(), title: "Conference trip", start: day(8), end: day(11), allDay: true, calendarId: "work", location: "Austin, TX", repeat: "none", reminder: null },
    { id: newId(), title: "Partner sync", start: `${day(-1)}T16:00`, end: `${day(-1)}T17:00`, allDay: false, calendarId: "work", repeat: "weekly", reminder: 10 },
    { id: newId(), title: "Dentist", start: `${day(-2)}T08:30`, end: `${day(-2)}T09:30`, allDay: false, calendarId: "personal", repeat: "none", reminder: null },
  ];
}

const EVENTS_KEY = "calender.events.v1";
const CALENDARS_KEY = "calender.calendars.v1";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the calendar still works for this visit.
  }
}

export const loadEvents = () => read<CalEvent[]>(EVENTS_KEY);
export const saveEvents = (events: CalEvent[]) => write(EVENTS_KEY, events);
export const loadCalendars = () => read<CalendarSource[]>(CALENDARS_KEY);
export const saveCalendars = (calendars: CalendarSource[]) => write(CALENDARS_KEY, calendars);
