"use client";

import { useState } from "react";
import {
  AlignLeft,
  ArrowRight,
  Bell,
  Briefcase,
  CalendarDays,
  Check,
  Copy,
  ListChecks,
  Lock,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Repeat,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";

import { isHiddenFromMe, myRsvp, type Instance } from "../lib/calendar";
import { caseById, ME, personById, TASKS } from "../lib/data";
import { REMINDERS, REPEATS } from "../lib/draft";
import { formatWhen } from "../lib/dates";
import type { Guest, Rsvp } from "../lib/types";
import { Avatar, Floating, IconButton, cx, type Anchor } from "./ui";

const RSVP_LABEL: Record<Rsvp, string> = { yes: "Yes", no: "No", maybe: "Maybe", pending: "awaiting" };

/**
 * Figma "Event details popover" (3.1 organizer, 3.2 invitation with RSVP,
 * 3.3 a teammate's private event that only shows Busy).
 */
export function EventDetails({
  anchor,
  instance,
  onEdit,
  onDelete,
  onRsvp,
  onProposeTime,
  onOpenCase,
  onCopy,
  onClose,
}: {
  anchor: Anchor;
  instance: Instance;
  onEdit: () => void;
  onDelete: () => void;
  onRsvp: (rsvp: Rsvp) => void;
  onProposeTime: () => void;
  onOpenCase: (caseId: string) => void;
  onCopy: (text: string, what: string) => void;
  onClose: () => void;
}) {
  const { event, start, end } = instance;
  const owner = personById(event.ownerId);
  const rsvp = myRsvp(event);
  const isOwner = event.ownerId === ME;
  const color = event.kind === "deadline" ? "#f5484d" : personById(rsvp ? ME : event.ownerId)?.color ?? "#17a34a";

  // 3.3: someone else's private event.
  if (isHiddenFromMe(event)) {
    return (
      <Floating anchor={anchor} width={340} label="Busy" onClose={onClose}>
        <div className="flex flex-col gap-4 px-5 pb-5 pt-2.5">
          <div className="flex justify-end">
            <IconButton aria-label="Close" onClick={onClose}><X /></IconButton>
          </div>
          <Title color={color} title="Busy" when={formatWhen(start, end, event.allDay)} />
          <Row icon={<Lock />}>
            <p className="text-[13px] leading-[18px] text-ink-2">
              {owner?.name} marked this event private. You can see {owner?.name.split(" ")[0]} is busy, but not the details.
            </p>
          </Row>
          <Row icon={<CalendarDays />}><p className="text-[13px] leading-[18px] text-ink-2">{owner?.name}</p></Row>
        </div>
      </Floating>
    );
  }

  const caseInfo = caseById(event.caseId);
  const task = TASKS.find((item) => item.id === event.taskId);
  const reminder = REMINDERS.find((item) => item.value === event.reminder);
  const people: Guest[] = [{ personId: event.ownerId, rsvp: "yes" }, ...event.guests.filter((guest) => guest.personId !== event.ownerId)];
  const yesCount = people.filter((guest) => guest.rsvp === "yes").length;
  const waiting = people.filter((guest) => guest.rsvp === "pending").length;
  const emails = event.guests.map((guest) => personById(guest.personId)?.name ?? guest.name).filter(Boolean).join(", ");

  return (
    <Floating anchor={anchor} width={420} label={event.title || "(No title)"} onClose={onClose}>
      <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto px-5 pb-5 pt-2.5">
        <div className="flex justify-end gap-0.5">
          {isOwner && (
            <>
              <IconButton aria-label="Edit event" title="Edit (E)" onClick={onEdit}><Pencil /></IconButton>
              <IconButton aria-label="Delete event" title="Delete" onClick={onDelete}><Trash2 /></IconButton>
            </>
          )}
          <IconButton
            aria-label="Email guests"
            title="Email guests"
            onClick={() => (window.location.href = `mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(`Guests: ${emails}`)}`)}
          >
            <Mail />
          </IconButton>
          <IconButton aria-label="Close" title="Close" onClick={onClose}><X /></IconButton>
        </div>

        <Title
          color={color}
          title={event.title || "(No title)"}
          when={formatWhen(start, end, event.allDay)}
          note={
            rsvp === "pending"
              ? `${owner?.name} invited you · awaiting your reply`
              : event.repeat !== "none"
                ? REPEATS.find((item) => item.value === event.repeat)?.label
                : undefined
          }
          noteIcon={event.repeat !== "none" && rsvp !== "pending" ? <Repeat className="size-3" /> : undefined}
        />

        {caseInfo && (
          <Row icon={<Briefcase />}>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col gap-0.5 rounded-xl border border-green-line bg-green-tint px-3.5 py-3">
                <p className="text-sm font-semibold leading-5 text-green-ink">{caseInfo.fullName}</p>
                <p className="text-xs leading-4 text-ink-2">{caseInfo.meta}</p>
                <button type="button" onClick={() => onOpenCase(caseInfo.id)} className="flex w-fit items-center gap-1 pt-1.5 text-[13px] font-semibold leading-[18px] text-green-link hover:underline">
                  Open case <ArrowRight className="size-3.5" />
                </button>
              </div>
              {task && (
                <p className="flex items-center gap-2 pl-0.5 text-[13px] font-medium leading-[18px] text-green-link">
                  <ListChecks className="size-4 shrink-0" />
                  <span className="truncate">{task.title}</span>
                </p>
              )}
            </div>
          </Row>
        )}

        {event.location && <Row icon={<MapPin />}><p className="text-[13px] leading-[18px] text-ink-2">{event.location}</p></Row>}

        {event.videoLink && (
          <Row icon={<Video />}>
            <div className="flex flex-col gap-1.5">
              <a
                href={`https://${event.videoLink}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-fit items-center rounded-[10px] bg-brand px-3 text-sm font-medium text-white hover:bg-[#0b3a35]"
              >
                Join with Alphalaw Meet
              </a>
              <button type="button" onClick={() => onCopy(event.videoLink!, "Meeting link")} className="flex w-fit items-center gap-1.5 text-xs text-ink-3 hover:text-ink-2">
                {event.videoLink}
                <Copy className="size-3.5" />
              </button>
            </div>
          </Row>
        )}

        {people.length > 1 && (
          <Row icon={<Users />}>
            <div className="flex flex-col gap-1.5">
              <div>
                <p className="text-sm font-medium leading-5 text-ink">{people.length} guests</p>
                <p className="text-xs leading-4 text-ink-3">
                  {[yesCount && `${yesCount} yes`, waiting && `${waiting} awaiting`, people.length - yesCount - waiting && `${people.length - yesCount - waiting} other`].filter(Boolean).join(", ")}
                </p>
              </div>
              {people.map((guest, i) => {
                const person = personById(guest.personId);
                const name = person?.name ?? guest.name ?? "Guest";
                const role =
                  guest.personId === event.ownerId
                    ? "Organizer"
                    : guest.personId === ME
                      ? guest.rsvp === "pending" ? "You · awaiting reply" : `You · ${RSVP_LABEL[guest.rsvp]}`
                      : person?.role ?? guest.role ?? "";
                return (
                  <div key={`${name}-${i}`} className="flex items-center gap-2.5">
                    <span className="relative">
                      <Avatar person={person} name={name} />
                      <RsvpBadge rsvp={guest.rsvp} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-medium leading-[18px] text-ink">{name}</span>
                      <span className="truncate text-xs leading-4 text-ink-3">{role}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Row>
        )}

        {event.description && <Row icon={<AlignLeft />}><p className="whitespace-pre-wrap text-[13px] leading-[18px] text-ink-2">{event.description}</p></Row>}
        {isOwner && reminder && reminder.value !== null && <Row icon={<Bell />}><p className="text-[13px] leading-[18px] text-ink-2">{reminder.label}</p></Row>}
        {isOwner && <Row icon={<CalendarDays />}><p className="text-[13px] leading-[18px] text-ink-2">{owner?.name}</p></Row>}

        {rsvp && <RsvpBar rsvp={rsvp} onRsvp={onRsvp} onProposeTime={onProposeTime} />}
      </div>
    </Floating>
  );
}

function Title({ color, title, when, note, noteIcon }: { color: string; title: string; when: string; note?: string; noteIcon?: React.ReactNode }) {
  return (
    <div className="flex gap-3.5">
      <span className="pt-1.5"><span className="block size-4 rounded" style={{ background: color }} /></span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-xl font-semibold leading-7 text-ink">{title}</h2>
        <p className="text-sm leading-5 text-ink-2">{when}</p>
        {note && <p className="flex items-center gap-1 text-xs leading-4 text-ink-3">{noteIcon}{note}</p>}
      </div>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5">
      <span className="shrink-0 text-ink-2 [&_svg]:size-[18px]">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function RsvpBadge({ rsvp }: { rsvp: Rsvp }) {
  const yes = rsvp === "yes";
  const no = rsvp === "no";
  return (
    <span
      className={cx(
        "absolute left-5 top-5 flex size-3.5 items-center justify-center rounded-full border-2 border-white text-white",
        yes ? "bg-green" : no ? "bg-danger" : "bg-[#a3a3a3]"
      )}
    >
      {yes ? <Check className="size-2" strokeWidth={4} /> : no ? <X className="size-2" strokeWidth={4} /> : <Minus className="size-2" strokeWidth={4} />}
    </span>
  );
}

/** "Going? Yes / No / Maybe" and "Propose a new time" (3.2). */
function RsvpBar({ rsvp, onRsvp, onProposeTime }: { rsvp: Rsvp; onRsvp: (rsvp: Rsvp) => void; onProposeTime: () => void }) {
  const [current, setCurrent] = useState(rsvp);
  return (
    <>
      <div className="flex items-center gap-2 border-t border-line pt-3.5">
        <p className="flex-1 text-[13px] font-medium leading-[18px] text-ink-2">Going?</p>
        <div role="radiogroup" aria-label="Going?" className="flex gap-0.5 rounded-[10px] bg-chip p-[3px]">
          {(["yes", "no", "maybe"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={current === value}
              onClick={() => {
                setCurrent(value);
                onRsvp(value);
              }}
              className={cx(
                "rounded-lg px-4 py-1.5 text-[13px] leading-[18px]",
                current === value ? "bg-[#213f3c] font-semibold text-white" : "font-medium text-ink-2 hover:bg-white/70"
              )}
            >
              {RSVP_LABEL[value]}
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={onProposeTime} className="w-fit text-[13px] font-semibold leading-[18px] text-green-link hover:underline">
        Propose a new time
      </button>
    </>
  );
}
