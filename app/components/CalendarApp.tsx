"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import rrulePlugin from "@fullcalendar/rrule";
import timeGridPlugin from "@fullcalendar/timegrid";
import type {
  DateSelectArg,
  DatesSetArg,
  DayHeaderContentArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";

import { addDays, addMinutes, formatTime, parseLocal, toDateStr, toDateTimeStr } from "../lib/dates";
import { type Draft, draftFromEvent, eventFromDraft, newDraft } from "../lib/draft";
import { toFullCalendarEvents } from "../lib/fullcalendar";
import { DEFAULT_CALENDARS, loadCalendars, loadEvents, sampleEvents, saveCalendars, saveEvents } from "../lib/store";
import type { CalendarSource, CalEvent, ViewType } from "../lib/types";
import { EventDialog } from "./EventDialog";
import { SearchResults, ShortcutsDialog, Toast, type ToastState } from "./Extras";
import { type Anchor, EventDetails, QuickCreate } from "./Popovers";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const VIEW_KEYS: Record<string, ViewType> = {
  d: "timeGridDay",
  w: "timeGridWeek",
  m: "dayGridMonth",
  y: "multiMonthYear",
  a: "listSchedule",
  x: "timeGridFourDay",
};

/** Center of the screen, for popovers opened from the keyboard. */
const centerAnchor = (): Anchor => ({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 3 });

/**
 * A Google Calendar-style calendar built on FullCalendar (free plugins only).
 * Events and calendars are kept in this browser (localStorage).
 */
export default function CalendarApp() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalEvent[]>(() => loadEvents() ?? sampleEvents());
  const [calendars, setCalendars] = useState<CalendarSource[]>(() => loadCalendars() ?? DEFAULT_CALENDARS);
  const [view, setView] = useState<ViewType>("timeGridWeek");
  const [range, setRange] = useState(() => ({ title: "", start: new Date(), end: new Date(), current: new Date() }));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState<string | null>(null);
  const [quick, setQuick] = useState<{ anchor: Anchor; draft: Draft } | null>(null);
  const [dialog, setDialog] = useState<Draft | null>(null);
  const [details, setDetails] = useState<{ anchor: Anchor; id: string; start: Date; end: Date } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const reminded = useRef(new Set<string>());

  useEffect(() => saveEvents(events), [events]);
  useEffect(() => saveCalendars(calendars), [calendars]);

  const api = () => calendarRef.current?.getApi();
  const defaultCalendar = calendars.find((calendar) => calendar.visible)?.id ?? calendars[0]?.id ?? "personal";
  const fcEvents = useMemo(() => toFullCalendarEvents(events, calendars), [events, calendars]);
  const openEvent = details ? events.find((event) => event.id === details.id) ?? null : null;

  const showToast = useCallback((message: string, undo?: () => void) => setToast({ id: Date.now(), message, undo }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const closeAll = () => {
    setQuick(null);
    setDetails(null);
  };

  // ── saving ──────────────────────────────────────────────────────────────
  const upsert = (draft: Draft) => {
    const event = eventFromDraft(draft);
    const exists = events.some((e) => e.id === event.id);
    const before = events;
    setEvents(exists ? events.map((e) => (e.id === event.id ? event : e)) : [...events, event]);
    showToast(exists ? "Event updated" : "Event saved", () => setEvents(before));
    // Show the saved event if it is outside the visible range.
    const start = parseLocal(event.start);
    if (start < range.start || start >= range.end) api()?.gotoDate(start);
  };

  const remove = (id: string) => {
    const before = events;
    setEvents(events.filter((event) => event.id !== id));
    setDetails(null);
    showToast("Event deleted", () => setEvents(before));
  };

  /** Drag to move / resize: new times from FullCalendar, with Undo. */
  const moveEvent = (info: EventDropArg | EventResizeDoneArg) => {
    const current = events.find((event) => event.id === info.event.id);
    const start = info.event.start;
    if (!current || !start) return info.revert();
    const allDay = info.event.allDay;
    const end = info.event.end ?? (allDay ? addDays(start, 1) : addMinutes(start, 60));
    const moved: CalEvent = {
      ...current,
      allDay,
      start: allDay ? toDateStr(start) : toDateTimeStr(start),
      end: allDay ? toDateStr(end) : toDateTimeStr(end),
    };
    const before = events;
    setEvents(events.map((event) => (event.id === moved.id ? moved : event)));
    showToast("event" in info && "delta" in info ? "Event moved" : "Event updated", () => setEvents(before));
  };

  // ── FullCalendar callbacks ─────────────────────────────────────────────
  const onSelect = (info: DateSelectArg) => {
    setDetails(null);
    const anchor = info.jsEvent ? { x: info.jsEvent.clientX, y: info.jsEvent.clientY } : centerAnchor();
    setQuick({ anchor, draft: newDraft(defaultCalendar, info.start, info.end, info.allDay) });
  };

  const onEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    setQuick(null);
    api()?.unselect();
    const start = info.event.start ?? new Date();
    const end = info.event.end ?? (info.event.allDay ? addDays(start, 1) : addMinutes(start, 60));
    setDetails({ anchor: { x: info.jsEvent.clientX, y: info.jsEvent.clientY }, id: info.event.id, start, end });
  };

  const onDatesSet = (arg: DatesSetArg) => {
    setRange({ title: arg.view.title, start: arg.view.activeStart, end: arg.view.activeEnd, current: arg.view.calendar.getDate() });
    setView(arg.view.type as ViewType);
  };

  // ── navigation ─────────────────────────────────────────────────────────
  const changeView = (next: ViewType) => {
    closeAll();
    api()?.changeView(next);
  };
  const goToday = () => api()?.today();
  const goPrev = () => api()?.prev();
  const goNext = () => api()?.next();
  const create = () => {
    closeAll();
    setDialog(newDraft(defaultCalendar));
  };

  // ── keyboard shortcuts (not while typing or with a form open) ──────────
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (dialog || shortcutsOpen || search !== null || quick) return;
      const key = event.key.toLowerCase();
      if (details && openEvent) {
        if (key === "e") {
          event.preventDefault();
          setDialog(draftFromEvent(openEvent));
          setDetails(null);
        } else if (key === "delete" || key === "backspace") {
          event.preventDefault();
          remove(openEvent.id);
        }
        return;
      }
      if (key === "t") goToday();
      else if (key === "j" || key === "n") goNext();
      else if (key === "k" || key === "p") goPrev();
      else if (key === "c") {
        event.preventDefault();
        create();
      } else if (key === "/") {
        event.preventDefault();
        setSearch("");
      } else if (event.key === "?") setShortcutsOpen(true);
      else if (VIEW_KEYS[key]) changeView(VIEW_KEYS[key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── reminders: a message when a one-off event's reminder time comes ─────
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      for (const event of events) {
        if (event.allDay || event.repeat !== "none" || event.reminder == null) continue;
        const start = parseLocal(event.start).getTime();
        const due = start - event.reminder * 60_000;
        const key = `${event.id}@${event.start}`;
        if (now >= due && now < start + 60_000 && !reminded.current.has(key)) {
          reminded.current.add(key);
          showToast(`Reminder: ${event.title || "(No title)"} at ${formatTime(new Date(start))}`);
        }
      }
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [events, showToast]);

  /** Google's day header in Day / Week / 4 days: "MON" over a big date, today in a blue circle. */
  const dayHeader = (arg: DayHeaderContentArg) => {
    if (!arg.view.type.startsWith("timeGrid")) return arg.text;
    const weekday = arg.date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
    return (
      <div className="gc-day-header">
        <span className={arg.isToday ? "gc-weekday gc-today-text" : "gc-weekday"}>{weekday}</span>
        <span className={arg.isToday ? "gc-date gc-today" : "gc-date"}>{arg.date.getDate()}</span>
      </div>
    );
  };

  return (
    <div className="flex h-dvh flex-col bg-white text-gray-900">
      <TopBar
        title={range.title}
        view={view}
        search={search}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onToday={goToday}
        onPrev={goPrev}
        onNext={goNext}
        onView={changeView}
        onSearch={setSearch}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && search === null && (
          <Sidebar
            selected={range.current}
            rangeStart={range.start}
            rangeEnd={range.end}
            calendars={calendars}
            onCreate={create}
            onPickDate={(date) => api()?.gotoDate(date)}
            onCalendarsChange={(next) => {
              setCalendars(next);
              // Events of a removed calendar move to the first one left.
              const ids = new Set(next.map((calendar) => calendar.id));
              if (events.some((event) => !ids.has(event.calendarId))) {
                setEvents(events.map((event) => (ids.has(event.calendarId) ? event : { ...event, calendarId: next[0].id })));
              }
            }}
          />
        )}
        <main className="relative min-h-0 min-w-0 flex-1 pr-2 sm:pr-4">
          {search !== null && (
            <div className="absolute inset-0 z-20 flex flex-col bg-white">
              <SearchResults
                query={search}
                events={events}
                calendars={calendars}
                onOpen={(event) => {
                  setSearch(null);
                  api()?.changeView("timeGridDay", parseLocal(event.start));
                }}
              />
            </div>
          )}
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, multiMonthPlugin, rrulePlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            height="100%"
            events={fcEvents}
            views={{
              timeGridFourDay: { type: "timeGrid", duration: { days: 4 } },
              listSchedule: { type: "list", duration: { days: 90 }, listDayFormat: { weekday: "short", month: "short", day: "numeric" }, listDaySideFormat: false },
              multiMonthYear: { multiMonthMaxColumns: 4 },
            }}
            nowIndicator
            selectable
            selectMirror
            editable
            eventResizableFromStart
            navLinks
            dayMaxEvents
            weekNumbers={false}
            scrollTime="07:00:00"
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            slotLabelFormat={{ hour: "numeric", meridiem: "short" }}
            eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
            dayHeaderContent={dayHeader}
            allDayText=""
            noEventsContent="No events in this period"
            select={onSelect}
            eventClick={onEventClick}
            eventDrop={moveEvent}
            eventResize={moveEvent}
            datesSet={onDatesSet}
            unselectAuto={false}
          />
        </main>
      </div>

      {quick && (
        <QuickCreate
          anchor={quick.anchor}
          draft={quick.draft}
          calendars={calendars}
          onChange={(draft) => setQuick({ ...quick, draft })}
          onSave={() => {
            upsert(quick.draft);
            setQuick(null);
            api()?.unselect();
          }}
          onMore={() => {
            setDialog(quick.draft);
            setQuick(null);
            api()?.unselect();
          }}
          onClose={() => {
            setQuick(null);
            api()?.unselect();
          }}
        />
      )}

      {details && openEvent && (
        <EventDetails
          anchor={details.anchor}
          event={openEvent}
          occurrence={{ start: details.start, end: details.end }}
          calendars={calendars}
          onEdit={() => {
            setDialog(draftFromEvent(openEvent));
            setDetails(null);
          }}
          onDuplicate={() => {
            setDialog({ ...draftFromEvent(openEvent), id: undefined, title: openEvent.title ? `${openEvent.title} (copy)` : "" });
            setDetails(null);
          }}
          onDelete={() => remove(openEvent.id)}
          onClose={() => setDetails(null)}
        />
      )}

      {dialog && (
        <EventDialog
          key={dialog.id ?? "new"}
          initial={dialog}
          calendars={calendars}
          onSave={(draft) => {
            upsert(draft);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      <Toast key={toast?.id} toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
