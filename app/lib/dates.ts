/** Date helpers on local wall-clock strings ("yyyy-MM-dd" / "yyyy-MM-ddTHH:mm"). */

const pad = (n: number) => String(n).padStart(2, "0");

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const toDateTimeStr = (d: Date) => `${toDateStr(d)}T${toTimeStr(d)}`;

/** "2026-10-23" or "2026-10-23T09:30" → local Date. */
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
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60_000);

/** ISO week number ("Week 43"). */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

const hm = (d: Date) => `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`;
const meridiem = (d: Date) => (d.getHours() < 12 ? "AM" : "PM");

/** "1:30 PM". */
export const formatTime = (d: Date) => `${hm(d)} ${meridiem(d)}`;

/** "10:00 – 11:30 AM", or "11:00 AM – 12:00 PM" across noon (as in Figma). */
export function formatTimeRange(start: Date, end: Date): string {
  return meridiem(start) === meridiem(end)
    ? `${hm(start)} – ${hm(end)} ${meridiem(end)}`
    : `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Friday, October 23". */
export const formatLongDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
/** "Fri, Oct 23, 2026". */
export const formatShortDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
/** "Fri, Oct 23". */
export const formatDayShort = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** "Friday, October 23 · 10:00 – 11:00 AM" (all-day: just the day or range). */
export function formatWhen(start: Date, end: Date, allDay: boolean): string {
  if (allDay) {
    const last = addDays(end, -1);
    return sameDay(start, last) ? formatLongDate(start) : `${formatLongDate(start)} – ${formatLongDate(last)}`;
  }
  if (sameDay(start, end)) return `${formatLongDate(start)} · ${formatTimeRange(start, end)}`;
  return `${formatLongDate(start)}, ${formatTime(start)} – ${formatLongDate(end)}, ${formatTime(end)}`;
}

/** "1 hr", "30 min", "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  return h ? `${h} hr` : `${m} min`;
}

/** "GMT-7" for the time grid's corner. */
export function timeZoneLabel(date = new Date()): string {
  const offset = -date.getTimezoneOffset();
  const hours = Math.trunc(offset / 60);
  const minutes = Math.abs(offset % 60);
  return `GMT${hours >= 0 ? "+" : ""}${hours}${minutes ? `:${pad(minutes)}` : ""}`;
}

/** Every 15 minutes, for the time pickers. */
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const d = new Date(2000, 0, 1, 0, i * 15);
  return { value: toTimeStr(d), label: formatTime(d) };
});
