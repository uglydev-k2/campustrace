"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A header link that marks itself as the current page.
 *
 * The active page is underlined by a bar that sits on the header's bottom
 * border. All the links share one `layoutId`, so when the page changes the
 * bar slides from the old link to the new one instead of jumping.
 */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center px-1 text-small font-medium transition-colors ${
        active ? "text-ink" : "text-ink-soft hover:text-ink"
      }`}
    >
      <span className="rounded-md px-2.5 py-1.5 transition-colors group-hover:bg-sunken">
        {children}
      </span>
      {active && (
        <motion.span
          layoutId="nav-indicator"
          aria-hidden
          className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-full bg-ink"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
    </Link>
  );
}
