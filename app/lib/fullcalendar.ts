import type { EventInput } from "@fullcalendar/core";

import type { CalendarSource, CalEvent, Repeat } from "./types";
import { parseLocal } from "./dates";

const FREQ: Record<Exclude<Repeat, "none">, string> = {
  daily: "daily",
  weekdays: "weekly",
  weekly: "weekly",
  monthly: "monthly",
  yearly: "yearly",
};

export const REPEAT_LABELS: Record<Repeat, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekdays: "Every weekday (Monday to Friday)",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Annually",
};

/** "HH:mm" duration between two local strings, for repeating events. */
function duration(event: CalEvent) {
  const minutes = Math.max(15, Math.round((parseLocal(event.end).getTime() - parseLocal(event.start).getTime()) / 60_000));
  if (event.allDay) return { days: Math.max(1, Math.round(minutes / 1440)) };
  return { minutes };
}

/** Our events → FullCalendar's, coloured by their calendar; hidden calendars are left out. */
export function toFullCalendarEvents(events: CalEvent[], calendars: CalendarSource[]): EventInput[] {
  const byId = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  return events.flatMap((event) => {
    const calendar = byId.get(event.calendarId);
    if (calendar && !calendar.visible) return [];
    const color = event.color ?? calendar?.color ?? "#039be5";
    const base: EventInput = {
      id: event.id,
      title: event.title || "(No title)",
      allDay: event.allDay,
      backgroundColor: color,
      borderColor: color,
      extendedProps: { calendarId: event.calendarId, repeat: event.repeat },
    };
    if (event.repeat === "none") return [{ ...base, start: event.start, end: event.end }];
    // Repeating events: moved and changed from their form (all events in the series), not by dragging.
    return [
      {
        ...base,
        editable: false,
        rrule: {
          freq: FREQ[event.repeat],
          dtstart: event.allDay ? event.start : `${event.start}:00`,
          ...(event.repeat === "weekdays" ? { byweekday: ["mo", "tu", "we", "th", "fr"] } : {}),
        },
        duration: duration(event),
      },
    ];
  });
}
