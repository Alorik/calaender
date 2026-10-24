"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { TIME_OPTIONS, formatDayShort, formatTimeRange, parseLocal, toDateStr, toTimeStr } from "../lib/dates";
import { Button, Floating, IconButton, SelectField, type Anchor } from "./ui";

/** "Propose a new time" from an invitation (3.2): pick a day and times, send it to the organizer. */
export function ProposeTime({
  anchor,
  start,
  end,
  organizer,
  onSend,
  onClose,
}: {
  anchor: Anchor;
  start: Date;
  end: Date;
  organizer: string;
  onSend: (message: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(toDateStr(start));
  const [from, setFrom] = useState(toTimeStr(start));
  const [to, setTo] = useState(toTimeStr(end));
  const newStart = parseLocal(`${date}T${from}`);
  const newEnd = parseLocal(`${date}T${to}`);
  const valid = newEnd > newStart;
  return (
    <Floating anchor={anchor} width={380} label="Propose a new time" onClose={onClose}>
      <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
        <div className="flex items-center gap-3">
          <p className="flex-1 text-base font-semibold leading-[26px] text-ink-2">Propose a new time</p>
          <IconButton aria-label="Close" onClick={onClose} className="h-8"><X /></IconButton>
        </div>
        <input
          type="date"
          aria-label="Day"
          value={date}
          onChange={(event) => event.target.value && setDate(event.target.value)}
          className="rounded-lg border border-line-2 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-green"
        />
        <div className="flex items-center gap-2">
          <SelectField label="From" value={from} options={TIME_OPTIONS} onChange={setFrom} className="flex-1" />
          <span className="text-ink-3">–</span>
          <SelectField label="To" value={to} options={TIME_OPTIONS} onChange={setTo} className="flex-1" />
        </div>
        {!valid && <p className="text-xs font-medium text-danger">The end time must be after the start time.</p>}
        <p className="text-xs text-ink-3">{organizer} gets your proposal and can accept it.</p>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => onSend(`Proposed ${formatDayShort(newStart)} · ${formatTimeRange(newStart, newEnd)} to ${organizer}`)}
          >
            Send proposal
          </Button>
        </div>
      </div>
    </Floating>
  );
}
