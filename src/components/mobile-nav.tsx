"use client";

import { LogOut, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import type { NavItem } from "@/components/site-header";
import { Avatar } from "@/components/user-menu";

/**
 * The menu on small screens: a panel that drops below the header, with
 * full-width rows that are easy to hit with a thumb. Page scrolling is
 * paused while it is open, and Escape or choosing a link closes it.
 */
export function MobileNav({
  links,
  user,
}: {
  links: NavItem[];
  user: { name: string; email: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when the route changes (for example after the back button).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const close = () => setOpen(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="grid size-10 place-items-center rounded-md text-ink transition-colors hover:bg-sunken"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-x-0 top-14 bottom-0 bg-navy-950/20"
            />
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-surface pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lift"
            >
              <nav aria-label="Main" className="container-page flex flex-col pt-2">
                {links.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * index, duration: 0.2 }}
                  >
                    <Link
                      href={link.href}
                      onClick={close}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      className="flex min-h-12 items-center justify-between border-b border-line text-[1.0625rem] font-medium text-ink-soft aria-[current=page]:text-ink"
                    >
                      {link.label}
                      {isActive(link.href) && (
                        <span aria-hidden className="size-1.5 rounded-full bg-brand-600" />
                      )}
                    </Link>
                  </motion.div>
                ))}

                <div className="mt-5">
                  {user ? (
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} className="size-9 text-caption" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-medium text-ink">{user.name}</p>
                        <p className="truncate text-caption text-ink-faint">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        <LogOut aria-hidden className="size-4" />
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/login" onClick={close} className="btn btn-secondary">
                        Sign in
                      </Link>
                      <Link href="/register" onClick={close} className="btn btn-primary">
                        Create account
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
