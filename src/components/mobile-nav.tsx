"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import type { NavItem } from "@/components/site-header";

/** The menu shown below the header on small screens. */
export function MobileNav({ links, userName }: { links: NavItem[]; userName: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Escape closes the menu, as people expect from any pop-up.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="grid size-11 place-items-center rounded-md text-white transition-colors hover:bg-navy-800"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute inset-x-0 top-16 border-t border-navy-700 bg-navy-900 pb-5 shadow-lift"
          >
            <nav aria-label="Main" className="container-page flex flex-col gap-1 pt-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="rounded-md px-3 py-3 text-body font-bold text-white hover:bg-navy-800 aria-[current=page]:bg-navy-800"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-navy-700 pt-4">
                {userName ? (
                  <>
                    <p className="px-3 text-small text-navy-200">Signed in as {userName}</p>
                    <SignOutButton className="btn btn-on-navy" />
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={close} className="btn btn-on-navy">
                      Sign in
                    </Link>
                    <Link href="/register" onClick={close} className="btn btn-primary">
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
