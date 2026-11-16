import { Bell } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { db } from "@/lib/db";

export type NavItem = { href: string; label: string };

/**
 * The bar at the top of every page.
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
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="container-page flex h-14 items-center gap-6">
        <Link
          href="/"
          className="-ml-1 flex items-center gap-2 rounded-md px-1 py-1 text-[0.9375rem] font-semibold tracking-[-0.02em] text-ink"
        >
          <BrandMark />
          {APP_NAME}
        </Link>

        <nav aria-label="Main" className="hidden h-full flex-1 items-stretch gap-0.5 lg:flex">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          {user ? (
            <>
              <Link
                href="/notifications"
                className="relative grid size-10 place-items-center rounded-md text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
                aria-label={
                  unread > 0 ? `Notifications, ${unread} unread` : "Notifications, none unread"
                }
              >
                <Bell aria-hidden className="size-[1.125rem]" strokeWidth={1.75} />
                {unread > 0 && (
                  <span
                    data-testid="unread-count"
                    className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-lost-400 px-1 text-[0.625rem] leading-none font-semibold text-navy-950 ring-2 ring-surface"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <div className="hidden lg:block">
                <UserMenu name={user.name} email={user.email} role={user.role} />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-1.5 lg:flex">
              <Link href="/login" className="btn btn-ghost btn-small">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary btn-small">
                Create account
              </Link>
            </div>
          )}
          <MobileNav links={links} user={user ? { name: user.name, email: user.email } : null} />
        </div>
      </div>
    </header>
  );
}
