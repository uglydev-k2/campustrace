import { ChevronRight } from "lucide-react";

/**
 * A native <details> element: keyboard and screen-reader support come free.
 * Used to keep rarely needed or destructive forms out of the way.
 */
export function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-bold text-brand-700 hover:text-brand-800 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform duration-150 group-open:rotate-90"
        />
        {summary}
      </summary>
      <div className="animate-rise pt-3 pb-1">{children}</div>
    </details>
  );
}
