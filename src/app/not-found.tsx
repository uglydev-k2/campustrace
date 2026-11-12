import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-20">
      <div className="max-w-xl">
        <h1 className="type-page">We could not find that page</h1>
        <p className="mt-3 text-lead text-ink-soft">
          The link may be out of date, the report may have been closed, or it may be something
          only its owner and the desk can open.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
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
