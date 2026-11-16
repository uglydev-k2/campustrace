import { ChevronRight } from "lucide-react";

/**
 * A native <details> element: keyboard and screen-reader support come free.
 * Used to keep rarely needed or destructive forms out of the way. It slides
 * open in browsers that can animate to `height: auto` (see .disclosure).
 */
export function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="disclosure group">
      <summary className="-mx-2 flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-small font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink group-open:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 text-ink-faint transition-transform duration-200 group-open:rotate-90"
        />
        {summary}
      </summary>
      <div className="pt-3 pb-1">{children}</div>
    </details>
  );
}
