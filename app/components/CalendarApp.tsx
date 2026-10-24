"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type {
  DateSelectArg,
  DatesSetArg,
  DayCellContentArg,
  DayHeaderContentArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { Briefcase, Search, X } from "lucide-react";

import { eventLook, instancesBetween, isShown, moveTo } from "../lib/calendar";
import { CASES, ME, caseById, personById, sampleEvents } from "../lib/data";
import { draftFromEvent, eventFromDraft, newDraft, type Draft } from "../lib/draft";
import {
  addDays,
  addMinutes,
  formatDayShort,
  formatTime,
  formatTimeRange,
  formatWhen,
  isoWeek,
  parseLocal,
  sameDay,
  timeZoneLabel,
} from "../lib/dates";
import { loadEvents, loadVisible, saveEvents, saveVisible } from "../lib/store";
import type { CalEvent, Rsvp, ViewType } from "../lib/types";
import { AppShell } from "./AppShell";
import { CalendarSidebar } from "./CalendarSidebar";
import { CalendarToolbar, type ToolbarSettings } from "./CalendarToolbar";
import { EventDetails } from "./EventDetails";
import { EventDialog } from "./EventDialog";
import { ProposeTime } from "./ProposeTime";
import { QuickAdd } from "./QuickAdd";
import { Toast, type ToastState } from "./Toast";
import { cx, useDismiss, type Anchor } from "./ui";

const VIEW_KEYS: Record<string, ViewType> = { d: "timeGridDay", w: "timeGridWeek", m: "dayGridMonth" };
const RSVP_TEXT: Record<Rsvp, string> = { yes: "Yes", no: "No", maybe: "Maybe", pending: "Pending" };

const centerAnchor = (): Anchor => {
  const x = window.innerWidth / 2 - 220;
  const y = window.innerHeight / 4;
  return { rect: { left: x, right: x, top: y, bottom: y } };
};

/** Toolbar title: "October 18 – 24, 2026", "Friday, October 23, 2026", "October 2026". */
function rangeTitle(view: ViewType, start: Date, end: Date, current: Date) {
  if (view === "timeGridDay") return start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (view === "dayGridMonth") return current.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const last = addDays(end, -1);
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "long" });
  if (start.getFullYear() !== last.getFullYear()) {
    return `${month(start)} ${start.getDate()}, ${start.getFullYear()} – ${month(last)} ${last.getDate()}, ${last.getFullYear()}`;
  }
  if (start.getMonth() !== last.getMonth()) return `${month(start)} ${start.getDate()} – ${month(last)} ${last.getDate()}, ${last.getFullYear()}`;
  return `${month(start)} ${start.getDate()} – ${last.getDate()}, ${last.getFullYear()}`;
}

/**
 * The Calendar page from Figma "🚧 Calendar UI" (Saloni Designs <> Alphalaw),
 * built on FullCalendar's free Day / Week / Month views. Events, people and
 * cases are sample data kept in this browser.
 */
export default function CalendarApp() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalEvent[]>(() => loadEvents() ?? sampleEvents());
  const [visible, setVisible] = useState(() => new Set(loadVisible()));
  const [caseId, setCaseId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("timeGridWeek");
  const [range, setRange] = useState(() => {
    const now = new Date();
    return { start: addDays(now, -now.getDay()), end: addDays(now, 7 - now.getDay()), current: now };
  });
  const [settings, setSettings] = useState<ToolbarSettings>({ showWeekends: true, weekStartsMonday: false });
  const [search, setSearch] = useState<string | null>(null);
  const [quick, setQuick] = useState<{ anchor: Anchor; draft: Draft } | null>(null);
  const [dialog, setDialog] = useState<Draft | null>(null);
  const [details, setDetails] = useState<{ anchor: Anchor; key: string } | null>(null);
  const [propose, setPropose] = useState<{ anchor: Anchor; key: string } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const reminded = useRef(new Set<string>());

  useEffect(() => saveEvents(events), [events]);
  useEffect(() => saveVisible([...visible]), [visible]);

  const api = () => calendarRef.current?.getApi();
  const showToast = useCallback((message: string, undo?: () => void) => setToast({ id: Date.now(), message, undo }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  // What is on screen: events of ticked calendars (and the case filter), one per occurrence.
  const shown = useMemo(() => events.filter((event) => isShown(event, visible, caseId)), [events, visible, caseId]);
  const instances = useMemo(() => instancesBetween(shown, addDays(range.start, -7), addDays(range.end, 7)), [shown, range]);
  const byKey = useMemo(() => new Map(instances.map((instance) => [instance.key, instance])), [instances]);
  const fcEvents = useMemo<EventInput[]>(
    () =>
      instances.map((instance) => ({
        id: instance.key,
        start: instance.start,
        end: instance.end,
        allDay: instance.event.allDay,
        // Only your own one-off events move by dragging; series and others' events open their card.
        editable: instance.event.ownerId === ME && instance.event.repeat === "none",
        extendedProps: { key: instance.key },
      })),
    [instances]
  );
  const caseCounts = useMemo(() => {
    const visibleNoCase = events.filter((event) => isShown(event, visible, null));
    const inRange = instancesBetween(visibleNoCase, range.start, range.end);
    return Object.fromEntries(CASES.map((item) => [item.id, inRange.filter((instance) => instance.event.caseId === item.id).length]));
  }, [events, visible, range]);

  const openInstance = details ? byKey.get(details.key) ?? null : null;
  const proposeInstance = propose ? byKey.get(propose.key) ?? null : null;

  const closePopovers = () => {
    setQuick(null);
    setDetails(null);
    setPropose(null);
    api()?.unselect();
  };

  // ── saving ──────────────────────────────────────────────────────────────
  const upsert = (draft: Draft) => {
    const event = eventFromDraft(draft);
    const exists = events.some((e) => e.id === event.id);
    const before = events;
    setEvents(exists ? events.map((e) => (e.id === event.id ? event : e)) : [...events, event]);
    const invited = event.guests.length;
    const name = event.title || "(No title)";
    showToast(
      exists
        ? `Saved “${name}”${invited ? " · Guests notified" : ""}`
        : `Event saved${invited ? ` · Invites sent to ${invited} guest${invited > 1 ? "s" : ""}` : ""}`,
      () => setEvents(before)
    );
    const start = parseLocal(event.start);
    if (start < range.start || start >= range.end) api()?.gotoDate(start);
  };

  const remove = (id: string) => {
    const before = events;
    const name = events.find((event) => event.id === id)?.title || "(No title)";
    setEvents(events.filter((event) => event.id !== id));
    closePopovers();
    setDialog(null);
    showToast(`Deleted “${name}”`, () => setEvents(before));
  };

  /** Drag to move / resize, with Undo (6.1, 6.2). */
  const onMoved = (info: EventDropArg | EventResizeDoneArg) => {
    const instance = byKey.get(info.event.extendedProps.key as string);
    const start = info.event.start;
    if (!instance || !start) return info.revert();
    const allDay = info.event.allDay;
    const end = info.event.end ?? (allDay ? addDays(start, 1) : addMinutes(start, 60));
    const moved = moveTo({ ...instance.event, allDay }, start, end);
    const before = events;
    setEvents(events.map((event) => (event.id === moved.id ? moved : event)));
    const notified = moved.guests.length ? " · Guests notified" : "";
    const when = allDay ? formatDayShort(start) : `${formatDayShort(start)} at ${formatTime(start)}`;
    showToast(
      "delta" in info ? `Moved “${moved.title}” to ${when}${notified}` : `Changed “${moved.title}” to ${formatTimeRange(start, end)}${notified}`,
      () => setEvents(before)
    );
  };

  const setRsvp = (key: string, rsvp: Rsvp) => {
    const instance = byKey.get(key);
    if (!instance) return;
    setEvents(
      events.map((event) =>
        event.id === instance.event.id
          ? { ...event, guests: event.guests.map((guest) => (guest.personId === ME ? { ...guest, rsvp } : guest)) }
          : event
      )
    );
    showToast(`Replied ${RSVP_TEXT[rsvp]} · ${personById(instance.event.ownerId)?.name} will be notified`);
  };

  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text.startsWith("http") ? text : `https://${text}`).catch(() => undefined);
    showToast(`${what} copied`);
  };

  // ── FullCalendar callbacks ─────────────────────────────────────────────
  const onSelect = (info: DateSelectArg) => {
    setDetails(null);
    const x = info.jsEvent?.clientX ?? window.innerWidth / 2;
    const y = info.jsEvent?.clientY ?? window.innerHeight / 3;
    setQuick({ anchor: { rect: { left: x, right: x, top: y, bottom: y } }, draft: newDraft(info.start, info.end, info.allDay, caseId ?? undefined) });
  };

  const onEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    setQuick(null);
    setPropose(null);
    api()?.unselect();
    const box = info.el.getBoundingClientRect();
    setDetails({ anchor: { rect: { left: box.left, right: box.right, top: box.top, bottom: box.bottom } }, key: info.event.extendedProps.key as string });
  };

  const onDatesSet = (arg: DatesSetArg) => {
    setRange({ start: arg.view.activeStart, end: arg.view.activeEnd, current: arg.view.calendar.getDate() });
    setView(arg.view.type as ViewType);
  };

  const changeView = (next: ViewType) => {
    closePopovers();
    api()?.changeView(next);
  };
  const create = () => {
    closePopovers();
    setDialog(newDraft(undefined, undefined, false, caseId ?? undefined));
  };
  const toggleCalendar = (personId: string) =>
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });

  // ── keyboard shortcuts (not while typing or with a form open) ──────────
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (dialog || quick || propose || search !== null) return;
      const key = event.key.toLowerCase();
      if (openInstance) {
        if (key === "e" && openInstance.event.ownerId === ME) {
          event.preventDefault();
          setDialog(draftFromEvent(openInstance.event));
          setDetails(null);
        } else if ((key === "delete" || key === "backspace") && openInstance.event.ownerId === ME) {
          event.preventDefault();
          remove(openInstance.event.id);
        }
        return;
      }
      if (key === "t") api()?.today();
      else if (key === "j" || key === "n") api()?.next();
      else if (key === "k" || key === "p") api()?.prev();
      else if (key === "c") {
        event.preventDefault();
        create();
      } else if (key === "/") {
        event.preventDefault();
        setSearch("");
      } else if (VIEW_KEYS[key]) changeView(VIEW_KEYS[key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── reminders: a message when one of your events is about to start ─────
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const today = instancesBetween(events.filter((event) => !event.allDay && event.reminder != null && (event.ownerId === ME || event.guests.some((g) => g.personId === ME && g.rsvp === "yes"))), addDays(now, -1), addDays(now, 1));
      for (const instance of today) {
        const due = addMinutes(instance.start, -(instance.event.reminder ?? 0));
        if (now >= due && now < instance.start && !reminded.current.has(instance.key)) {
          reminded.current.add(instance.key);
          showToast(`Starting at ${formatTime(instance.start)}: ${instance.event.title}`);
        }
      }
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [events, showToast]);

  // ── rendering hooks ────────────────────────────────────────────────────
  const dayHeader = (arg: DayHeaderContentArg) => {
    const weekday = arg.date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    if (arg.view.type === "dayGridMonth") return weekday;
    const weekend = arg.date.getDay() === 0 || arg.date.getDay() === 6;
    return (
      <div className={cx("flex flex-col gap-0.5 py-1", arg.view.type === "timeGridDay" ? "items-start pl-3" : "items-center")}>
        <span className={cx("text-[11px] leading-[14px]", arg.isToday ? "font-semibold text-green" : "font-medium text-ink-3")}>{weekday}</span>
        {arg.isToday ? (
          <span className="flex size-9 items-center justify-center rounded-full bg-green text-xl font-semibold leading-6 text-white">{arg.date.getDate()}</span>
        ) : (
          <span className={cx("flex h-9 items-center text-xl font-medium", weekend ? "text-ink-3" : "text-ink")}>{arg.date.getDate()}</span>
        )}
      </div>
    );
  };

  const dayCell = (arg: DayCellContentArg) => {
    const label = arg.date.getDate() === 1 ? arg.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : String(arg.date.getDate());
    return (
      <span
        className={cx(
          "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium",
          arg.isToday ? "bg-green font-semibold text-white" : arg.isOther ? "text-ink-5" : "text-ink-2"
        )}
      >
        {label}
      </span>
    );
  };

  const eventContent = (arg: EventContentArg) => {
    const instance = byKey.get(arg.event.extendedProps.key as string);
    if (!instance) return null;
    const look = eventLook(instance.event);
    const caseInfo = caseById(instance.event.caseId);
    const isTimeGrid = arg.view.type.startsWith("timeGrid");
    const minutes = (instance.end.getTime() - instance.start.getTime()) / 60_000;

    // Month view timed events: "• 9:00 Team stand-up".
    if (!instance.event.allDay && !isTimeGrid) {
      return (
        <div className={cx("flex w-full min-w-0 items-center gap-1.5 px-1 text-[11px] leading-4", look.declined && "opacity-50")}>
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: look.color }} />
          <span className="shrink-0 font-medium text-ink-2">{formatTime(instance.start).replace(" AM", "").replace(" PM", "")}</span>
          <span className={cx("truncate font-medium text-ink", look.declined && "line-through")}>{look.title}</span>
        </div>
      );
    }

    const style = look.dashed
      ? { background: "#fff", border: `1.5px dashed ${look.color}` }
      : { background: look.bg, borderLeft: `3px solid ${look.stripe}` };

    // All-day bars (24px).
    if (instance.event.allDay) {
      return (
        <div className={cx("cal-event flex h-6 items-center rounded-md px-2", look.declined && "opacity-50")} style={style}>
          <span className={cx("truncate text-xs font-semibold leading-4 text-ink", look.declined && "line-through")}>{look.title}</span>
        </div>
      );
    }

    const time = `${formatTimeRange(instance.start, instance.end)}${look.status ? ` · ${look.status}` : ""}`;
    return (
      <div className={cx("cal-event flex h-full flex-col gap-0.5 overflow-hidden rounded-md px-2 py-1", look.declined && "opacity-50")} style={style}>
        <p className={cx("text-xs font-semibold leading-4 text-ink", minutes <= 30 ? "truncate" : "line-clamp-2", look.declined && "line-through")}>
          {/* Short events show their start next to the title ("Team stand-up · 9:00"). */}
          {minutes <= 30 ? `${look.title} · ${formatTime(instance.start).replace(/ (AM|PM)$/, "")}` : look.title}
        </p>
        {minutes > 30 && <p className="truncate text-[11px] leading-[14px] text-ink-3">{time}</p>}
        {minutes >= 60 && caseInfo && look.title !== "Busy" && (
          <p className="flex min-w-0 items-center gap-1 text-[11px] font-medium leading-[14px] text-green-ink">
            <Briefcase className="size-3 shrink-0" />
            <span className="truncate">{caseInfo.name}</span>
          </p>
        )}
      </div>
    );
  };

  const week = view === "timeGridWeek" ? isoWeek(addDays(range.start, 1)) : null;
  const title = rangeTitle(view, range.start, range.end, range.current);

  return (
    <AppShell onSearch={() => setSearch("")}>
      <CalendarToolbar
        title={title}
        week={week}
        view={view}
        caseId={caseId}
        caseCounts={caseCounts}
        visible={visible}
        settings={settings}
        searchOpen={search !== null}
        onToday={() => api()?.today()}
        onPrev={() => api()?.prev()}
        onNext={() => api()?.next()}
        onView={changeView}
        onCase={setCaseId}
        onToggleCalendar={toggleCalendar}
        onSettings={setSettings}
        onSearchOpen={() => setSearch("")}
        search={
          <SearchBox
            query={search ?? ""}
            events={events.filter((event) => isShown(event, visible, null))}
            onQuery={setSearch}
            onClose={() => setSearch(null)}
            onOpen={(event) => {
              setSearch(null);
              api()?.changeView("timeGridDay", parseLocal(event.start));
              setDetails({ anchor: centerAnchor(), key: `${event.id}@${event.start.split("T")[0]}` });
            }}
          />
        }
      />
      <div className="flex min-h-0 flex-1 gap-2">
        <CalendarSidebar
          selected={range.current}
          highlight={view === "timeGridWeek" ? { start: range.start, end: range.end } : null}
          weekStartsMonday={settings.weekStartsMonday}
          visible={visible}
          caseId={caseId}
          caseCounts={caseCounts}
          onCreate={create}
          onPickDate={(date) => api()?.gotoDate(date)}
          onToggleCalendar={toggleCalendar}
          onOnly={(personId) => setVisible(new Set([personId]))}
          onShowAll={() => setVisible(new Set(["hs", "mr", "cb", "sk", "ts", "jr", "mg"]))}
          onCase={setCaseId}
        />
        <section
          aria-label="Calendar"
          className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl bg-white"
          style={{ "--tz-label": `"${timeZoneLabel()}"` } as React.CSSProperties}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            // Day numbers only in Month view (the all-day row of Day / Week has none).
            views={{ dayGridMonth: { dayCellContent: dayCell } }}
            height="100%"
            events={fcEvents}
            weekends={settings.showWeekends}
            firstDay={settings.weekStartsMonday ? 1 : 0}
            nowIndicator
            selectable
            selectMirror
            editable
            eventResizableFromStart
            dayMaxEvents
            navLinks
            navLinkDayClick={(date) => api()?.changeView("timeGridDay", date)}
            allDayText="All-day"
            scrollTime="07:00:00"
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            slotLabelInterval="01:00"
            slotLabelContent={(arg) => `${arg.date.getHours() % 12 || 12} ${arg.date.getHours() < 12 ? "AM" : "PM"}`}
            dayHeaderContent={dayHeader}
            eventContent={eventContent}
            moreLinkContent={(arg) => `${arg.num} more`}
            select={onSelect}
            eventClick={onEventClick}
            eventDrop={onMoved}
            eventResize={onMoved}
            datesSet={onDatesSet}
            unselectAuto={false}
          />
        </section>
      </div>

      {quick && (
        <QuickAdd
          anchor={quick.anchor}
          draft={quick.draft}
          events={events}
          onChange={(draft) => setQuick({ ...quick, draft })}
          onSave={() => {
            upsert(quick.draft);
            closePopovers();
          }}
          onMore={() => {
            setDialog(quick.draft);
            closePopovers();
          }}
          onClose={closePopovers}
        />
      )}

      {details && openInstance && (
        <EventDetails
          anchor={details.anchor}
          instance={openInstance}
          onEdit={() => {
            setDialog(draftFromEvent(openInstance.event));
            setDetails(null);
          }}
          onDelete={() => remove(openInstance.event.id)}
          onRsvp={(rsvp) => setRsvp(openInstance.key, rsvp)}
          onProposeTime={() => {
            setPropose({ anchor: details.anchor, key: openInstance.key });
            setDetails(null);
          }}
          onOpenCase={(id) => {
            setCaseId(id);
            setDetails(null);
            showToast(`Showing events for ${caseById(id)?.name}`);
          }}
          onCopy={copy}
          onClose={() => setDetails(null)}
        />
      )}

      {propose && proposeInstance && (
        <ProposeTime
          anchor={propose.anchor}
          start={proposeInstance.start}
          end={proposeInstance.end}
          organizer={personById(proposeInstance.event.ownerId)?.name ?? "The organizer"}
          onSend={(message) => {
            setPropose(null);
            showToast(message);
          }}
          onClose={() => setPropose(null)}
        />
      )}

      {dialog && (
        <EventDialog
          key={dialog.id ?? "new"}
          initial={dialog}
          events={events}
          onSave={(draft) => {
            upsert(draft);
            setDialog(null);
          }}
          onDelete={dialog.id ? () => remove(dialog.id!) : undefined}
          onClose={() => setDialog(null)}
          onCopy={copy}
        />
      )}

      <Toast key={toast?.id} toast={toast} onDismiss={dismissToast} />
    </AppShell>
  );
}

/** Toolbar search: matching events (title, place, notes, case), soonest first. */
function SearchBox({
  query,
  events,
  onQuery,
  onClose,
  onOpen,
}: {
  query: string;
  events: CalEvent[];
  onQuery: (query: string) => void;
  onClose: () => void;
  onOpen: (event: CalEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, onClose);
  const q = query.trim().toLowerCase();
  const matches = q
    ? events
        .filter((event) =>
          [event.title, event.location, event.description, caseById(event.caseId)?.name].some((text) => text?.toLowerCase().includes(q))
        )
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 12)
    : [];
  return (
    <div ref={ref} className="relative">
      <label className="flex h-9 w-64 items-center gap-2 rounded-[10px] border border-green bg-field px-2.5">
        <Search className="size-4 text-ink-3" />
        <input
          autoFocus
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search events"
          aria-label="Search events"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
        <button type="button" aria-label="Close search" onClick={onClose} className="text-ink-3 hover:text-ink">
          <X className="size-4" />
        </button>
      </label>
      {q && (
        <ul className="absolute right-0 z-40 mt-1 max-h-96 w-96 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-pop">
          {matches.length === 0 && <li className="px-3 py-3 text-sm text-ink-3">No events match “{query}”.</li>}
          {matches.map((event) => {
            const look = eventLook(event);
            const start = parseLocal(event.start);
            return (
              <li key={event.id}>
                <button type="button" onClick={() => onOpen(event)} className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-soft">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: look.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{look.title}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {formatWhen(start, parseLocal(event.end), event.allDay)}
                      {event.repeat !== "none" && " · repeats"}
                    </span>
                  </span>
                  {sameDay(start, new Date()) && <span className="rounded bg-green-tint px-1.5 text-[11px] font-medium text-green-link">Today</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

