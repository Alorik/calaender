"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Briefcase,
  Calendar,
  CalendarSearch,
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  Copy,
  Eye,
  ListChecks,
  MapPin,
  Repeat,
  Users,
  Video,
  X,
} from "lucide-react";

import { busyOn, clash, suggestTimes } from "../lib/calendar";
import { CASES, ME, TASKS, caseById, personById } from "../lib/data";
import {
  REMINDERS,
  REPEATS,
  draftEnd,
  draftError,
  draftStart,
  makeMeetLink,
  moveDraftStart,
  type Draft,
} from "../lib/draft";
import {
  TIME_OPTIONS,
  addMinutes,
  formatDayShort,
  formatDuration,
  formatShortDate,
  formatTimeRange,
  minutesBetween,
  parseLocal,
  startOfDay,
  toDateStr,
  toDateTimeStr,
} from "../lib/dates";
import type { CalEvent, Guest, Repeat as RepeatValue, Visibility } from "../lib/types";
import { GuestPicker } from "./GuestPicker";
import { Avatar, Button, IconButton, SelectField, Switch, cx, useDismiss } from "./ui";

/** Availability strip: 7 AM – 8 PM. */
const DAY_START = 7 * 60;
const DAY_END = 20 * 60;
const AXIS = ["7 AM", "9 AM", "11 AM", "1 PM", "3 PM", "5 PM", "7 PM"];

const FIELD = "flex items-center gap-2 rounded-lg border border-line-2 bg-field px-3 py-[9px] text-sm leading-5 text-ink focus-within:border-green";
const LABEL = "text-[13px] font-medium leading-[18px] text-ink-2";

/**
 * Figma "Event dialog" (2.2 New event, 6.3 Edit with a guest conflict): time,
 * guests with free / busy, the availability strip (click a row to move the
 * event), linked case and related task, location, Alphalaw Meet link,
 * description, reminder and visibility.
 */
export function EventDialog({
  initial,
  events,
  onSave,
  onDelete,
  onClose,
  onCopy,
}: {
  initial: Draft;
  events: CalEvent[];
  onSave: (draft: Draft) => void;
  onDelete?: () => void;
  onClose: () => void;
  onCopy: (text: string, what: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [tried, setTried] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const editing = !!initial.id;
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const start = draftStart(draft);
  const end = draftEnd(draft);
  const error = draftError(draft);
  const minutes = minutesBetween(start, end);

  useDismiss(ref, onClose);

  // People whose calendars we can see: you and the firm guests.
  const firmGuests = draft.guests.filter((guest) => guest.personId && guest.personId !== ME);
  const people = [ME, ...firmGuests.map((guest) => guest.personId!)];
  const conflicts = useMemo(
    () =>
      draft.allDay || error
        ? []
        : people
            .map((personId) => ({ personId, busy: clash(events, personId, start, end, draft.id) }))
            .filter((item) => item.busy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, draft, error]
  );
  const suggestions = useMemo(
    () => (conflicts.length ? suggestTimes(events, people, start, minutes, draft.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conflicts.length, events, draft.date, minutes]
  );

  const save = () => {
    setTried(true);
    if (!error) onSave(draft);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") save();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const endOptions = TIME_OPTIONS.filter((option) => option.value > draft.startTime).map((option) => {
    const length = minutesBetween(parseLocal(`${draft.date}T${draft.startTime}`), parseLocal(`${draft.date}T${option.value}`));
    return { value: option.value, label: `${option.label} (${formatDuration(length)})` };
  });
  const caseInfo = caseById(draft.caseId);
  const tasks = TASKS.filter((task) => task.caseId === draft.caseId);
  const accepted = draft.guests.filter((guest) => guest.rsvp === "yes").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/20 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit event" : "New event"}
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-[1000px] flex-col overflow-hidden rounded-[20px] bg-white shadow-dialog"
      >
        <div className="flex items-center gap-3 px-6 py-4">
          <h2 className="flex-1 text-lg font-semibold leading-[26px] text-ink">{editing ? "Edit event" : "New event"}</h2>
          <IconButton aria-label="Close" onClick={onClose}><X /></IconButton>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-3 md:flex-row">
          {/* ── Left column ─────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <input
              autoFocus
              value={draft.title}
              onChange={(event) => set({ title: event.target.value })}
              placeholder="Add title"
              aria-label="Title"
              className="border-b-2 border-green pb-0.5 text-2xl font-medium leading-8 text-ink outline-none placeholder:text-ink-4"
            />

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className={cx(FIELD, "relative cursor-pointer")}>
                  <Calendar className="size-[18px] text-ink-2" />
                  <span className="font-medium">{formatShortDate(start)}</span>
                  <input
                    type="date"
                    aria-label="Date"
                    value={draft.date}
                    onChange={(event) => event.target.value && setDraft(moveDraftStart(draft, parseLocal(draft.allDay ? event.target.value : `${event.target.value}T${draft.startTime}`)))}
                    onClick={(event) => (event.currentTarget as HTMLInputElement).showPicker?.()}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                {!draft.allDay && (
                  <>
                    <SelectField
                      label="Start time"
                      value={draft.startTime}
                      options={TIME_OPTIONS}
                      onChange={(value) => setDraft(moveDraftStart(draft, parseLocal(`${draft.date}T${value}`)))}
                      className="w-[120px] [&>button]:font-medium"
                    />
                    <span className="text-sm text-ink-3">–</span>
                    <SelectField
                      label="End time"
                      value={draft.endTime}
                      options={endOptions}
                      display={endOptions.find((option) => option.value === draft.endTime)?.label ?? draft.endTime}
                      onChange={(value) => set({ endTime: value, endDate: draft.date })}
                      className="w-[150px] [&>button]:font-medium"
                    />
                  </>
                )}
                <label className="ml-auto flex items-center gap-2 text-[13px] font-medium text-ink-2">
                  <Switch checked={draft.allDay} label="All day" onChange={(allDay) => set({ allDay, endDate: draft.date })} />
                  All day
                </label>
              </div>
              <SelectField
                label="Repeat"
                value={draft.repeat}
                icon={<Repeat />}
                options={REPEATS}
                onChange={(repeat) => set({ repeat: repeat as RepeatValue })}
                className="w-fit min-w-[220px]"
              />
              {tried && error && (
                <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-danger">
                  <CircleAlert className="size-3.5" /> {error}
                </p>
              )}
            </div>

            {/* Guests */}
            <section aria-label="Guests" className="flex flex-col gap-2">
              <SectionLabel icon={<Users />} title="Guests" aside={draft.guests.length ? `${draft.guests.length} invited${editing && accepted ? ` · ${accepted} accepted` : ""}` : undefined} />
              <GuestPicker guests={draft.guests} onAdd={(guest) => set({ guests: [...draft.guests, guest] })} />
              {draft.guests.length > 0 && (
                <ul className="flex flex-col">
                  {draft.guests.map((guest, i) => (
                    <GuestRow
                      key={guest.personId ?? `${guest.name}-${i}`}
                      guest={guest}
                      busy={guest.personId && !draft.allDay && !error ? clash(events, guest.personId, start, end, draft.id) : null}
                      showReply={editing}
                      onRemove={() => set({ guests: draft.guests.filter((_, j) => j !== i) })}
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* Availability */}
            {!draft.allDay && (
              <section aria-label="Availability" className="flex flex-col gap-3">
                <SectionLabel icon={<CalendarSearch />} title="Availability" aside={`${formatDayShort(start)} · click a row to move the event`} />
                <div className="flex flex-col gap-2 rounded-xl border border-line bg-field p-3">
                  {people.map((personId) => (
                    <AvailabilityRow
                      key={personId}
                      personId={personId}
                      events={events}
                      day={start}
                      start={start}
                      end={end}
                      excludeId={draft.id}
                      onPick={(minute) => {
                        const day = startOfDay(start);
                        setDraft(moveDraftStart(draft, addMinutes(day, minute)));
                      }}
                    />
                  ))}
                  <div className="flex gap-2">
                    <span className="w-[104px] shrink-0" />
                    <div className="relative h-3 flex-1 text-[10px] leading-3 text-ink-3">
                      {AXIS.map((label, i) => (
                        <span key={label} className="absolute -translate-x-1/2" style={{ left: `${((i * 120) / (DAY_END - DAY_START)) * 100}%` }}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {conflicts.length === 0 ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium leading-4 text-green-link">
                      <CircleCheck className="size-3.5" /> Everyone is free at this time
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {conflicts.map(({ personId, busy }) => (
                        <p key={personId} className="flex items-center gap-1.5 text-xs font-medium leading-4 text-danger">
                          <CircleAlert className="size-3.5" />
                          {personId === ME ? "You are" : `${personById(personId)?.name} is`} busy at {formatTimeRange(busy!.start, busy!.end)}
                        </p>
                      ))}
                      {suggestions.length > 0 && (
                        <>
                          <p className="text-xs leading-4 text-ink-3">Times that work for everyone:</p>
                          <div className="flex flex-wrap gap-2">
                            {suggestions.map((slot) => (
                              <button
                                key={slot.start.toISOString()}
                                type="button"
                                onClick={() => {
                                  const [endDate, endTime] = toDateTimeStr(slot.end).split("T");
                                  set({ date: toDateStr(slot.start), startTime: toDateTimeStr(slot.start).split("T")[1], endDate, endTime });
                                }}
                                className="flex items-center gap-1.5 rounded-full border border-green px-2.5 py-1 text-xs font-medium text-green-ink hover:bg-green-tint"
                              >
                                <Clock className="size-3.5" />
                                {formatDayShort(slot.start)} · {formatTimeRange(slot.start, slot.end)}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ── Right column ────────────────────────────────────────── */}
          <div className="flex w-full shrink-0 flex-col gap-5 md:w-[360px]">
            <section aria-label="Linked case" className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold leading-5 text-ink">
                  <Briefcase className="size-4" /> Linked case
                </span>
                <span className="text-xs leading-4 text-ink-3">Shows on the case</span>
              </div>
              {caseInfo ? (
                <div className="flex flex-col gap-0.5 rounded-xl border border-green-line bg-green-tint p-3">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-green-ink">{caseInfo.fullName}</p>
                    <button type="button" aria-label="Unlink case" onClick={() => set({ caseId: undefined, taskId: undefined })} className="text-ink-2 hover:text-ink">
                      <X className="size-4" />
                    </button>
                  </div>
                  <p className="text-xs leading-4 text-ink-2">{caseInfo.meta}</p>
                </div>
              ) : (
                <SelectField
                  label="Linked case"
                  value=""
                  icon={<Briefcase />}
                  placeholder="Link a case"
                  options={CASES.map((item) => ({ value: item.id, label: item.fullName }))}
                  onChange={(caseId) => set({ caseId, taskId: undefined })}
                />
              )}
              {caseInfo && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[13px] leading-[18px]">
                    <span className="font-medium text-ink-2">Related task </span>
                    <span className="text-ink-3">(optional)</span>
                  </p>
                  <SelectField
                    label="Related task"
                    value={draft.taskId ?? ""}
                    icon={<ListChecks />}
                    placeholder="Pick a task"
                    options={[{ value: "", label: "No task" }, ...tasks.map((task) => ({ value: task.id, label: task.title }))]}
                    onChange={(taskId) => set({ taskId: taskId || undefined })}
                  />
                </div>
              )}
            </section>

            <div className="flex flex-col gap-2">
              <span className={LABEL}>Location</span>
              <label className={FIELD}>
                <MapPin className="size-[18px] shrink-0 text-ink-2" />
                <input value={draft.location} onChange={(event) => set({ location: event.target.value })} placeholder="Add a room or address" aria-label="Location" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3" />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <span className={LABEL}>Video call</span>
              {draft.videoLink ? (
                <div className="flex items-center gap-2 rounded-lg bg-soft py-2 pl-3 pr-2">
                  <Video className="size-[18px] shrink-0 text-green-link" />
                  <a href={`https://${draft.videoLink}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[13px] font-medium leading-[18px] text-green-link hover:underline">
                    {draft.videoLink}
                  </a>
                  <button type="button" aria-label="Copy link" onClick={() => onCopy(draft.videoLink, "Meeting link")} className="rounded p-0.5 text-ink-2 hover:bg-chip">
                    <Copy className="size-4" />
                  </button>
                  <button type="button" aria-label="Remove video call" onClick={() => set({ videoLink: "" })} className="rounded p-0.5 text-ink-2 hover:bg-chip">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <Button onClick={() => set({ videoLink: makeMeetLink(draft.title) })} className="w-fit gap-2 [&>svg]:size-4">
                  <Video /> Add Alphalaw Meet link
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className={LABEL}>Description</span>
              <textarea
                value={draft.description}
                onChange={(event) => set({ description: event.target.value })}
                placeholder="Add notes for the guests"
                aria-label="Description"
                rows={4}
                className="h-[92px] resize-y rounded-lg border border-line-2 bg-field px-3 py-2.5 text-sm leading-5 text-ink outline-none placeholder:text-ink-3 focus:border-green"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className={LABEL}>Reminder</span>
                <SelectField
                  label="Reminder"
                  value={draft.reminder === null ? "none" : String(draft.reminder)}
                  icon={<Bell />}
                  options={REMINDERS.map((item) => ({ value: item.value === null ? "none" : String(item.value), label: item.short }))}
                  onChange={(value) => set({ reminder: value === "none" ? null : Number(value) })}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className={LABEL}>Visibility</span>
                <SelectField
                  label="Visibility"
                  value={draft.visibility}
                  icon={<Eye />}
                  options={[
                    { value: "firm", label: "Firm" },
                    { value: "private", label: "Private" },
                  ]}
                  onChange={(visibility) => set({ visibility: visibility as Visibility })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line px-7 py-4">
          {onDelete && <Button onClick={onDelete}>Delete</Button>}
          <span className="flex-1" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} className="gap-1.5 [&>svg]:size-4">
            <Check /> {editing ? "Save" : "Save event"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon, title, aside }: { icon: React.ReactNode; title: string; aside?: string }) {
  return (
    <div className="flex items-center gap-2 [&>svg]:size-4">
      {icon}
      <span className="text-sm font-semibold leading-5 text-ink">{title}</span>
      {aside && <span className="flex-1 text-right text-xs leading-4 text-ink-3">{aside}</span>}
    </div>
  );
}

/** Figma "Guest row": avatar, name and role, Free / Busy at the chosen time, remove. */
function GuestRow({ guest, busy, showReply, onRemove }: { guest: Guest; busy: { label: string } | null; showReply: boolean; onRemove: () => void }) {
  const person = personById(guest.personId);
  const name = person?.name ?? guest.name ?? "Guest";
  const reply = guest.rsvp === "yes" ? "Accepted" : guest.rsvp === "no" ? "Declined" : guest.rsvp === "maybe" ? "Maybe" : "Awaiting reply";
  const role = person?.role ?? guest.role ?? "";
  return (
    <li className="flex h-12 items-center gap-3 px-1">
      <Avatar person={person} name={name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium leading-5 text-ink">{name}</span>
        <span className="truncate text-xs leading-4 text-ink-3">{showReply ? `${role} · ${reply}` : role}</span>
      </div>
      {person && (
        <span
          className={cx(
            "flex max-w-[200px] items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            busy ? "bg-danger-tint text-danger" : "bg-green-tint text-green-link"
          )}
        >
          <span className={cx("size-1.5 shrink-0 rounded-full", busy ? "bg-danger" : "bg-green")} />
          <span className="truncate">{busy ? `Busy · ${busy.label}` : "Free"}</span>
        </span>
      )}
      <button type="button" aria-label={`Remove ${name}`} onClick={onRemove} className="rounded p-0.5 text-ink-2 hover:bg-chip">
        <X className="size-4" />
      </button>
    </li>
  );
}

/** One row of the availability strip; clicking the track moves the event there (half-hour steps). */
function AvailabilityRow({
  personId,
  events,
  day,
  start,
  end,
  excludeId,
  onPick,
}: {
  personId: string;
  events: CalEvent[];
  day: Date;
  start: Date;
  end: Date;
  excludeId?: string;
  onPick: (minuteOfDay: number) => void;
}) {
  const person = personById(personId)!;
  const blocks = busyOn(events, personId, day, excludeId);
  const span = DAY_END - DAY_START;
  const minuteOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
  const pct = (minute: number) => `${(Math.min(Math.max(minute, DAY_START), DAY_END) - DAY_START) / span * 100}%`;
  const width = (from: number, to: number) => `${(Math.min(to, DAY_END) - Math.max(from, DAY_START)) / span * 100}%`;
  const s = minuteOf(start);
  const e = minuteOf(end) || 24 * 60;
  const clashes = blocks.some((block) => minuteOf(block.start) < e && s < (minuteOf(block.end) || 24 * 60));
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-[104px] shrink-0 items-center gap-1.5">
        <Avatar person={person} size={24} />
        <span className="truncate text-xs font-medium text-ink-2">{personId === ME ? "You" : person.name.split(" ")[0]}</span>
      </span>
      <button
        type="button"
        aria-label={`${personId === ME ? "Your" : `${person.name}’s`} day: click to move the event`}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const minute = DAY_START + ((event.clientX - box.left) / box.width) * span;
          onPick(Math.min(DAY_END - 30, Math.max(DAY_START, Math.round(minute / 30) * 30)));
        }}
        className="relative h-[22px] min-w-0 flex-1 cursor-pointer overflow-hidden rounded-md bg-chip"
      >
        {blocks.map((block) => (
          <span
            key={block.start.toISOString()}
            title={`${block.label} · ${formatTimeRange(block.start, block.end)}`}
            className="absolute inset-y-0"
            style={{ left: pct(minuteOf(block.start)), width: width(minuteOf(block.start), minuteOf(block.end) || 24 * 60), background: person.busy }}
          />
        ))}
        {e > DAY_START && s < DAY_END && (
          <span
            className="absolute inset-y-0 rounded border-[1.5px]"
            style={{
              left: pct(s),
              width: width(s, e),
              borderColor: clashes ? "#d92d20" : "#17a34a",
              background: clashes ? "rgba(217,45,32,0.16)" : "rgba(23,163,74,0.18)",
            }}
          />
        )}
      </button>
    </div>
  );
}
