/** One calendar in the side panel ("Work", "Personal", …). */
export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

/**
 * One event as the app stores it. Times are local wall-clock strings:
 * "2026-10-24T09:30" for timed events, "2026-10-24" for all-day ones (end is
 * exclusive, as in Google Calendar and FullCalendar).
 */
export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarId: string;
  /** Own colour; otherwise the calendar's. */
  color?: string;
  location?: string;
  description?: string;
  guests?: string[];
  videoLink?: string;
  /** Minutes before the start; null = no reminder. */
  reminder?: number | null;
  repeat: Repeat;
}

export type ViewType =
  | "timeGridDay"
  | "timeGridWeek"
  | "dayGridMonth"
  | "timeGridFourDay"
  | "listSchedule"
  | "multiMonthYear";
