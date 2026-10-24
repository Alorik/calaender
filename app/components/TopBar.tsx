"use client";

import { useEffect, useRef, useState } from "react";

import type { ViewType } from "../lib/types";
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, CloseIcon, KeyboardIcon, MenuIcon, SearchIcon } from "./icons";

export const VIEW_OPTIONS: { value: ViewType; label: string; key: string }[] = [
  { value: "timeGridDay", label: "Day", key: "D" },
  { value: "timeGridWeek", label: "Week", key: "W" },
  { value: "dayGridMonth", label: "Month", key: "M" },
  { value: "multiMonthYear", label: "Year", key: "Y" },
  { value: "listSchedule", label: "Schedule", key: "A" },
  { value: "timeGridFourDay", label: "4 days", key: "X" },
];

/**
 * Top bar, as in Google Calendar: menu, logo, Today, back / next, the range
 * title, search, keyboard shortcuts and the view picker.
 */
export function TopBar({
  title,
  view,
  search,
  onToggleSidebar,
  onToday,
  onPrev,
  onNext,
  onView,
  onSearch,
  onShowShortcuts,
}: {
  title: string;
  view: ViewType;
  search: string | null;
  onToggleSidebar: () => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onView: (view: ViewType) => void;
  /** null = search closed. */
  onSearch: (query: string | null) => void;
  onShowShortcuts: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const viewLabel = VIEW_OPTIONS.find((option) => option.value === view)?.label ?? "Week";

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const iconButton = "rounded-full p-2 text-gray-600 hover:bg-gray-100";

  if (search !== null) {
    return (
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-4">
        <button type="button" aria-label="Close search" onClick={() => onSearch(null)} className={iconButton}>
          <ChevronLeft />
        </button>
        <div className="flex h-12 flex-1 items-center gap-3 rounded-lg bg-gray-100 px-4 focus-within:bg-white focus-within:shadow">
          <SearchIcon className="size-5 text-gray-500" />
          <input
            autoFocus
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && onSearch(null)}
            placeholder="Search events"
            aria-label="Search events"
            className="flex-1 bg-transparent text-base outline-none"
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => onSearch("")} className="text-gray-500">
              <CloseIcon />
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-1 border-b border-gray-200 px-2 sm:px-4">
      <button type="button" aria-label="Main menu" onClick={onToggleSidebar} className={iconButton}>
        <MenuIcon className="size-6" />
      </button>
      <div className="mr-4 hidden items-center gap-2 pl-1 sm:flex">
        <span className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white">
          <CalendarIcon className="size-6" />
        </span>
        <span className="text-[22px] text-gray-700">Calendar</span>
      </div>
      <button
        type="button"
        onClick={onToday}
        title="Today (T)"
        className="mr-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        Today
      </button>
      <button type="button" aria-label="Previous" title="Previous (K)" onClick={onPrev} className={iconButton}>
        <ChevronLeft />
      </button>
      <button type="button" aria-label="Next" title="Next (J)" onClick={onNext} className={iconButton}>
        <ChevronRight />
      </button>
      <h1 className="ml-2 truncate text-lg text-gray-800 sm:text-[22px]">{title}</h1>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" aria-label="Search" title="Search (/)" onClick={() => onSearch("")} className={iconButton}>
          <SearchIcon />
        </button>
        <button type="button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onClick={onShowShortcuts} className={`${iconButton} hidden sm:block`}>
          <KeyboardIcon />
        </button>
        <div ref={menuRef} className="relative ml-1">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {viewLabel}
            <ChevronDown className="size-4" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 z-30 mt-1 w-48 rounded-md bg-white py-2 shadow-lg ring-1 ring-black/10">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={option.value === view}
                  onClick={() => {
                    onView(option.value);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-gray-100 ${option.value === view ? "bg-blue-50 text-blue-800" : "text-gray-800"}`}
                >
                  {option.label}
                  <span className="text-xs text-gray-500">{option.key}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
