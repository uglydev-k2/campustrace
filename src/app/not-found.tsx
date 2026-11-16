import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-20 sm:py-28">
      <div className="max-w-lg">
        <span className="grid size-10 place-items-center rounded-lg border border-line bg-surface text-ink-faint shadow-xs">
          <SearchX aria-hidden className="size-5" />
        </span>
        <p className="type-reference mt-6 text-caption text-ink-faint">404</p>
        <h1 className="type-page mt-1">We could not find that page</h1>
        <p className="mt-3 text-ink-soft">
          The link may be out of date, the report may have been closed, or it may be something
          only its owner and the desk can open.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/browse" className="btn btn-primary">
            Browse items
          </Link>
          <Link href="/" className="btn btn-secondary">
            Go to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
