"use client";

import { useEffect } from "react";
import { CircleCheck, X } from "lucide-react";

export interface ToastState {
  id: number;
  message: string;
  undo?: () => void;
}

/** Figma "Toast": dark pill at the bottom centre, green check, Undo. */
export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <div role="status" className="fixed bottom-6 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-[#1f2523] py-2.5 pl-3.5 pr-2 text-[13px] text-white shadow-dialog">
      <CircleCheck className="size-4 shrink-0 text-[#4ade80]" />
      <span className="min-w-0 truncate">{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            onDismiss();
          }}
          className="rounded-md px-2 py-1 font-semibold text-[#4ade80] hover:bg-white/10"
        >
          Undo
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className="rounded-md p-1 text-white/70 hover:bg-white/10">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
