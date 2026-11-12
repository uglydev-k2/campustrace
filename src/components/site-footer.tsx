import Link from "next/link";
import { APP_NAME, CAMPUS_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-sunken">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="type-card">{APP_NAME}</p>
          <p className="mt-2 text-small text-ink-soft">
            A student software engineering project that uses {CAMPUS_NAME} as its demonstration
            setting. It is not an official university service, and the collection points and
            accounts in it are sample data.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-small">
          <Link href="/browse" className="link">
            Browse items
          </Link>
          <Link href="/report/found" className="link">
            Report a found item
          </Link>
          <Link href="/report/lost" className="link">
            Report a lost item
          </Link>
          <Link href="/#how-it-works" className="link">
            How a return works
          </Link>
        </nav>
      </div>
    </footer>
  );
}
