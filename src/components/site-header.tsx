import { Bell, Tag } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { db } from "@/lib/db";

export type NavItem = { href: string; label: string };

/**
 * The navy bar at the top of every page.
 * A server component: it reads the session and the unread count directly.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const unread = user
    ? await db.notification.count({ where: { userId: user.id, readAt: null } })
    : 0;

  const links: NavItem[] = [
    { href: "/browse", label: "Browse items" },
    { href: "/report/found", label: "I found something" },
    { href: "/report/lost", label: "I lost something" },
  ];
  if (user) links.push({ href: "/dashboard", label: "My activity" });
  if (user?.role === "ADMIN") links.push({ href: "/admin", label: "Desk" });

  return (
    <header className="sticky top-0 z-40 bg-navy-900 text-white">
      <div className="container-page flex h-16 items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-[1.375rem] font-semibold tracking-tight text-white"
          style={{ fontVariationSettings: '"SOFT" 60, "WONK" 0' }}
        >
          <span className="grid size-8 place-items-center rounded-md bg-brand-600">
            <Tag aria-hidden className="size-4.5" strokeWidth={2.5} />
          </span>
          {APP_NAME}
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {user ? (
            <>
              <Link
                href="/notifications"
                className="relative grid size-11 place-items-center rounded-md text-white transition-colors hover:bg-navy-800"
                aria-label={
                  unread > 0 ? `Notifications, ${unread} unread` : "Notifications, none unread"
                }
              >
                <Bell aria-hidden className="size-5" />
                {unread > 0 && (
                  <span
                    data-testid="unread-count"
                    className="absolute top-1 right-1 grid min-w-5 place-items-center rounded-full bg-lost-400 px-1 text-[0.6875rem] leading-5 font-bold text-navy-950"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <div className="hidden items-center gap-3 lg:flex">
                <span className="max-w-40 truncate text-small text-navy-200">{user.name}</span>
                <SignOutButton className="btn btn-on-navy btn-small" />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/login" className="btn btn-on-navy btn-small">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary btn-small">
                Create account
              </Link>
            </div>
          )}
          <MobileNav links={links} userName={user?.name ?? null} />
        </div>
      </div>
    </header>
  );
}
