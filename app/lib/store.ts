import type { CalEvent } from "./types";
import { ME } from "./data";

const EVENTS_KEY = "alphalaw-calendar.events.v1";
const VISIBLE_KEY = "alphalaw-calendar.visible.v1";

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

/** Ticked calendars: you, Megan and Chandler at first (as in Figma, "3 calendars"). */
export const loadVisible = () => read<string[]>(VISIBLE_KEY) ?? [ME, "mr", "cb"];
export const saveVisible = (ids: string[]) => write(VISIBLE_KEY, ids);
