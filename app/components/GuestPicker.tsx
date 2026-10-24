"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, UserPlus } from "lucide-react";

import { ME, PEOPLE } from "../lib/data";
import type { Guest } from "../lib/types";
import { Avatar, cx, useDismiss } from "./ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Figma "Add guests" field: type a name or role to pick someone in the firm,
 * or an email address for someone outside it.
 */
export function GuestPicker({
  guests,
  onAdd,
  compact,
  placeholder = "Add guests by name or role",
}: {
  guests: Guest[];
  onAdd: (guest: Guest) => void;
  compact?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setOpen(false), open);
  const q = query.trim().toLowerCase();
  const taken = new Set(guests.map((guest) => guest.personId).filter(Boolean));
  const matches = useMemo(
    () =>
      PEOPLE.filter((person) => person.id !== ME && !taken.has(person.id)).filter(
        (person) => !q || `${person.name} ${person.role}`.toLowerCase().includes(q)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, guests]
  );
  const isEmail = EMAIL.test(query.trim());

  const pick = (guest: Guest) => {
    onAdd(guest);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      <label
        className={cx(
          "flex w-full items-center gap-2 rounded-lg border border-line-2 bg-field focus-within:border-green",
          compact ? "px-2.5 py-2" : "px-3 py-[9px]"
        )}
      >
        <UserPlus className={cx("shrink-0 text-ink-2", compact ? "size-4" : "size-[18px]")} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (isEmail) pick({ name: query.trim(), role: "Outside guest", rsvp: "pending" });
              else if (matches[0]) pick({ personId: matches[0].id, rsvp: "pending" });
            }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder={compact ? "Add guests" : placeholder}
          aria-label="Add guests"
          className={cx("min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3", compact ? "text-[13px] leading-[18px]" : "text-sm leading-5")}
        />
        {compact && <ChevronDown className="size-4 text-ink-3" />}
      </label>
      {open && (matches.length > 0 || isEmail) && (
        <ul role="listbox" aria-label="People" className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-pop">
          {matches.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => pick({ personId: person.id, rsvp: "pending" })}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-soft"
              >
                <Avatar person={person} size={24} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-medium text-ink">{person.name}</span>
                  <span className="truncate text-xs text-ink-3">{person.role}</span>
                </span>
              </button>
            </li>
          ))}
          {isEmail && (
            <li>
              <button
                type="button"
                onClick={() => pick({ name: query.trim(), role: "Outside guest", rsvp: "pending" })}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink hover:bg-soft"
              >
                <UserPlus className="size-4 text-ink-2" />
                Invite {query.trim()}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
