import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { APP_NAME, CAMPUS_NAME } from "@/lib/constants";

const LINKS = [
  { href: "/browse", label: "Browse items" },
  { href: "/report/found", label: "Report a found item" },
  { href: "/report/lost", label: "Report a lost item" },
  { href: "/#how-it-works", label: "How a return works" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-start">
        <div className="max-w-md">
          <p className="flex items-center gap-2 text-small font-semibold text-ink">
            <BrandMark className="size-5" />
            {APP_NAME}
          </p>
          <p className="mt-3 text-caption text-ink-faint">
            A student software engineering project that uses {CAMPUS_NAME} as its demonstration
            setting. It is not an official university service, and the collection points and
            accounts in it are sample data.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-small sm:flex sm:flex-wrap sm:gap-x-6">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-ink-soft transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
