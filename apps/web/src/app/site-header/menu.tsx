"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { menuItem } from "./menu-item";

// A button that opens a panel below it: tap or click to open, again to close (no hover, per
// docs/decisions/0002-screen-sizes.md). Escape, a tap outside or following a link closes it.
export function Menu({
  label,
  button,
  align = "start",
  children,
}: {
  // What a screen reader hears for the button, when its visible content doesn't say it.
  label?: string;
  button: ReactNode;
  align?: "start" | "end";
  children: ReactNode;
}) {
  const pathname = usePathname();
  // Open on the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const close = () => setOpenOn(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpenOn(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenOn(null);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="relative min-w-0"
      onBlur={(e) => {
        // Tabbing out of the menu closes it.
        if (open && e.relatedTarget && !root.current?.contains(e.relatedTarget as Node)) close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenOn(open ? null : pathname)}
        className={`${menuItem} w-full max-w-full gap-2`}
      >
        {button}
        <Chevron open={open} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        onClick={(e) => {
          if ((e.target as Element).closest("a")) close();
        }}
        className={`absolute top-full z-20 mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-2xl border border-black/10 bg-background p-2 shadow-lg dark:border-white/15 ${align === "end" ? "right-0" : "left-0"}`}
      >
        {children}
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
