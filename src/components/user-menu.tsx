"use client";

import { ChevronDown, LayoutList, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const letters = (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "");
  return letters.toUpperCase() || "?";
}

export function Avatar({ name, className = "size-7 text-[0.6875rem]" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-100 ${className}`}
    >
      {initials(name)}
    </span>
  );
}

/**
 * The account button on wide screens: who is signed in, and signing out.
 *
 * A disclosure (button + panel) rather than an ARIA menu, so it behaves like
 * ordinary links and buttons for screen readers. Escape, a click outside, or
 * choosing an item closes it; focus returns to the button.
 */
export function UserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-2 rounded-md pr-2 pl-1.5 text-small font-medium text-ink transition-colors hover:bg-sunken aria-expanded:bg-sunken"
      >
        <Avatar name={name} />
        <span className="max-w-36 truncate">{name}</span>
        <ChevronDown
          aria-hidden
          className={`size-3.5 text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        <span className="sr-only">Account</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full right-0 mt-1.5 w-64 origin-top-right rounded-lg bg-surface p-1.5 shadow-pop"
          >
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <Avatar name={name} className="size-8 text-caption" />
              <div className="min-w-0">
                <p className="truncate text-small font-medium text-ink">{name}</p>
                <p className="truncate text-caption text-ink-faint">{email}</p>
              </div>
            </div>
            <p className="mx-2.5 mb-1 text-caption text-ink-faint">
              {role === "ADMIN" ? "Collection desk staff" : "Student"}
            </p>
            <div className="my-1 h-px bg-line" />
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-small text-ink transition-colors hover:bg-sunken"
            >
              <LayoutList aria-hidden className="size-4 text-ink-faint" />
              My activity
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-small text-ink transition-colors hover:bg-sunken"
            >
              <LogOut aria-hidden className="size-4 text-ink-faint" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
