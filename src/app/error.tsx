"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";

/**
 * Shown when a page throws an unexpected error.
 * The details stay in the server log; the visitor gets a way forward.
 */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page py-20 sm:py-28">
      <div className="max-w-lg">
        <span className="grid size-10 place-items-center rounded-lg border border-danger-100 bg-danger-50 text-danger-700">
          <TriangleAlert aria-hidden className="size-5" />
        </span>
        <h1 className="type-page mt-6">Something went wrong</h1>
        <p className="mt-3 text-ink-soft">
          The page could not be loaded. Try again, and if it keeps happening, tell the collection
          desk what you were doing when it happened.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RotateCw aria-hidden className="size-4" />
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Go to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
