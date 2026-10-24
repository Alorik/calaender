"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import type { Person } from "../lib/types";

/*
 * Small pieces used across the calendar, from the Figma components:
 * Button / Icon Button (10px corners, 36px), Calendar avatar, Switch, a
 * select menu and floating cards.
 */

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const BUTTON = "inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-[10px] px-2 text-sm font-medium leading-5 whitespace-nowrap transition-colors disabled:opacity-50";

/** Figma "Button" variants: outline (Today, Cancel), primary (Save), ghost (More options). */
export function Button({
  variant = "outline",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "outline" | "primary" | "ghost" }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        BUTTON,
        variant === "outline" && "border border-border bg-field text-ink hover:bg-chip",
        variant === "primary" && "bg-brand px-3 text-white hover:bg-[#0b3a35]",
        variant === "ghost" && "text-ink hover:bg-chip",
        className
      )}
    />
  );
}

/** Figma "Icon Button": 36px, 16px icon. */
export function IconButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx("inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-ink-2 hover:bg-chip [&_svg]:size-4", className)}
    />
  );
}

/** Figma "Calendar avatar": initials on the person's tint (24, 28 or 32px). */
export function Avatar({ person, size = 32, name }: { person?: Person; size?: 24 | 28 | 32; name?: string }) {
  const initials = person?.initials ?? (name ?? "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === 24 ? "size-6 text-[10px]" : size === 28 ? "h-7 min-w-7 px-1.5 text-xs" : "size-8 text-xs"
      )}
      style={{ background: person?.avatarBg ?? "#eaeaea", color: person?.color ?? "#7c7c7c" }}
    >
      {initials}
    </span>
  );
}

/** Figma "Switch" (small): 32 × 16. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("flex h-4 w-8 shrink-0 items-center rounded-full px-0.5 transition-colors", checked ? "bg-green" : "bg-border")}
    >
      <span className={cx("size-3 rounded-full bg-field transition-transform", checked && "translate-x-4")} />
    </button>
  );
}

/** Figma checkbox in the calendar list: filled with the calendar colour when ticked. */
export function ColorCheckbox({ checked, color, label, onChange }: { checked: boolean; color: string; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="flex size-4 shrink-0 items-center justify-center rounded"
      style={checked ? { background: color } : { border: "1.5px solid #c7c6c6", background: "#fff" }}
    >
      {checked && <Check className="size-3 text-white" strokeWidth={3} />}
    </button>
  );
}

/** Closes on Esc and on a click outside `ref` (after the click that opened it). */
export function useDismiss(ref: React.RefObject<HTMLElement | null>, onClose: () => void, enabled = true) {
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && latest.current();
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (ref.current?.contains(target) || target.closest?.("[data-keep-open]")) return;
      latest.current();
    };
    window.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onDown);
    };
  }, [ref, enabled]);
}

export interface Anchor {
  /** The clicked element's box: the card opens beside it. */
  rect: { left: number; right: number; top: number; bottom: number };
}

/** A floating card beside `anchor` (right if there is room, else left), kept on screen. */
export function Floating({
  anchor,
  width,
  label,
  onClose,
  children,
}: {
  anchor: Anchor;
  width: number;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useDismiss(ref, onClose);

  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 400;
    const { left, right, top } = anchor.rect;
    const gap = 12;
    const x = right + gap + width < window.innerWidth - 8 ? right + gap : Math.max(8, left - gap - width);
    const y = Math.min(Math.max(8, top - 40), window.innerHeight - height - 8);
    setPos({ left: x, top: y });
  }, [anchor, width]);

  // The card is hidden until placed, so autoFocus cannot work: focus its first field once it shows.
  const placed = pos !== null;
  useEffect(() => {
    if (placed) ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [placed]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="fixed z-40 rounded-2xl border border-line bg-white shadow-pop"
      style={{ width, left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      {children}
    </div>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/** Figma "Field" with a chevron: opens a list of options under it. */
export function SelectField<T extends string>({
  value,
  options,
  onChange,
  label,
  icon,
  placeholder,
  className,
  display,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  /** Text shown in the field (defaults to the option's label). */
  display?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setOpen(false), open);
  const current = options.find((option) => option.value === value);
  return (
    <div ref={ref} className={cx("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-line-2 bg-field px-3 py-[9px] text-left text-sm text-ink hover:border-border [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-ink-2"
      >
        {icon}
        <span className={cx("min-w-0 flex-1 truncate leading-5", !current && "text-ink-3")}>{display ?? current?.label ?? placeholder}</span>
        <ChevronDown className="!size-4 text-ink-3" />
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="absolute left-0 z-50 mt-1 max-h-64 min-w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-pop">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-soft [&>svg]:size-4",
                  option.value === value ? "font-semibold text-green-ink" : "text-ink"
                )}
              >
                {option.icon}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.value === value && <Check className="text-green" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
