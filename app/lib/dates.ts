/** Small date helpers on local wall-clock strings ("yyyy-MM-dd" / "yyyy-MM-ddTHH:mm"). */

const pad = (n: number) => String(n).padStart(2, "0");

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const toDateTimeStr = (d: Date) => `${toDateStr(d)}T${toTimeStr(d)}`;

/** "2026-10-24" or "2026-10-24T09:30" → Date in local time. */
export function parseLocal(value: string): Date {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

export const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

export const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** "9:30 AM". */
export const formatTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** "Saturday, October 24". */
export const formatLongDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

/** The line Google shows under an event's title, e.g. "Saturday, October 24 · 9:30 – 10:30 AM". */
export function formatEventWhen(start: Date, end: Date, allDay: boolean): string {
  if (allDay) {
    const lastDay = addDays(end, -1);
    return sameDay(start, lastDay) ? formatLongDate(start) : `${formatLongDate(start)} – ${formatLongDate(lastDay)}`;
  }
  if (sameDay(start, end)) return `${formatLongDate(start)} · ${formatTime(start)} – ${formatTime(end)}`;
  return `${formatLongDate(start)}, ${formatTime(start)} – ${formatLongDate(end)}, ${formatTime(end)}`;
}

/** Times every 15 minutes, for the time pickers. */
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const d = new Date(2000, 0, 1, 0, i * 15);
  return { value: toTimeStr(d), label: formatTime(d) };
});
