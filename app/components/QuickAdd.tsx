"use client";

import { Briefcase, Clock, Users, X } from "lucide-react";

import { clash } from "../lib/calendar";
import { CASES, personById } from "../lib/data";
import { REPEATS, draftEnd, draftStart, type Draft } from "../lib/draft";
import { formatWhen, timeZoneLabel } from "../lib/dates";
import type { CalEvent } from "../lib/types";
import { GuestPicker } from "./GuestPicker";
import { Avatar, Button, Floating, IconButton, SelectField, type Anchor } from "./ui";

/** Figma 2.1 "Drag to create · Quick add": title, time, guests with free / busy, linked case. */
export function QuickAdd({
  anchor,
  draft,
  events,
  onChange,
  onSave,
  onMore,
  onClose,
}: {
  anchor: Anchor;
  draft: Draft;
  events: CalEvent[];
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onMore: () => void;
  onClose: () => void;
}) {
  const start = draftStart(draft);
  const end = draftEnd(draft);
  const repeat = REPEATS.find((item) => item.value === draft.repeat)?.label ?? "Doesn’t repeat";
  return (
    <Floating anchor={anchor} width={420} label="New event" onClose={onClose}>
      <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
        <div className="flex items-center gap-3">
          <p className="flex-1 text-base font-semibold leading-[26px] text-ink-2">New event</p>
          <IconButton aria-label="Close" onClick={onClose} className="h-8"><X /></IconButton>
        </div>
        <input
          data-autofocus
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          onKeyDown={(event) => event.key === "Enter" && onSave()}
          placeholder="Add title"
          aria-label="Title"
          className="border-b-2 border-green pb-1 text-xl font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-4"
        />
        <div className="flex gap-3">
          <Clock className="size-[18px] shrink-0 text-ink-2" />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium leading-5 text-ink">{formatWhen(start, end, draft.allDay)}</p>
            <p className="text-xs leading-4 text-ink-3">{timeZoneLabel(start)} · {repeat}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Users className="size-[18px] shrink-0 text-ink-2" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {draft.guests.map((guest, i) => {
              const person = personById(guest.personId);
              const busy = person && !draft.allDay ? clash(events, person.id, start, end) : null;
              return (
                <div key={guest.personId ?? `${guest.name}-${i}`} className="flex items-center gap-2">
                  <Avatar person={person} name={guest.name} size={24} />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-medium leading-[18px] text-ink">{person?.name ?? guest.name}</p>
                  {person && (
                    <span className={busy ? "rounded-full bg-danger-tint px-2 py-0.5 text-[11px] font-medium text-danger" : "rounded-full bg-green-tint px-2 py-0.5 text-[11px] font-medium text-green-link"}>
                      {busy ? "Busy" : "Free"}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${person?.name ?? guest.name}`}
                    onClick={() => onChange({ ...draft, guests: draft.guests.filter((_, j) => j !== i) })}
                    className="text-ink-3 hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })}
            <GuestPicker compact guests={draft.guests} onAdd={(guest) => onChange({ ...draft, guests: [...draft.guests, guest] })} />
          </div>
        </div>
        <div className="flex gap-3">
          <Briefcase className="mt-2.5 size-[18px] shrink-0 text-ink-2" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <SelectField
              label="Linked case"
              value={draft.caseId ?? ""}
              placeholder="Link a case"
              options={[{ value: "", label: "No case" }, ...CASES.map((item) => ({ value: item.id, label: item.fullName }))]}
              onChange={(caseId) => onChange({ ...draft, caseId: caseId || undefined, taskId: undefined })}
            />
            <p className="text-xs leading-4 text-ink-3">
              {draft.caseId ? "The event will show on the case and in Next Best Actions." : "Link a case to show the event on it."}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onMore}>More options</Button>
          <Button variant="primary" onClick={onSave}>Save</Button>
        </div>
      </div>
    </Floating>
  );
}
