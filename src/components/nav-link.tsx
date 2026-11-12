"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A header link that marks itself as the current page. */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-2 text-small font-bold transition-colors ${
        active ? "bg-navy-800 text-white" : "text-navy-200 hover:bg-navy-800 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
