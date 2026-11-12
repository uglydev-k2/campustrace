"use client";

/**
 * Shown when a page throws an unexpected error.
 * The details stay in the server log; the visitor gets a way forward.
 */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page py-20">
      <div className="max-w-xl">
        <h1 className="type-page">Something went wrong</h1>
        <p className="mt-3 text-lead text-ink-soft">
          The page could not be loaded. Try again, and if it keeps happening, tell the collection
          desk what you were doing when it happened.
        </p>
        <button type="button" onClick={reset} className="btn btn-primary mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}
