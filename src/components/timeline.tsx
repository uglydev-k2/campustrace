import { formatDateTime } from "@/lib/format";

export type TimelineEvent = {
  id: string;
  message: string;
  createdAt: Date;
};

/**
 * Workflow history, newest last. Rows come from the append-only
 * WorkflowEvent table, so this is a faithful record of what happened.
 * The newest entry gets a filled marker; earlier ones are hollow.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-small text-ink-faint">Nothing has happened yet.</p>;
  }
  return (
    <ol className="relative">
      {events.map((event, index) => {
        const last = index === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span aria-hidden className="absolute top-4 bottom-0 left-[4.5px] w-px bg-line-strong" />
            )}
            <span
              aria-hidden
              className={`relative mt-1.5 size-2.5 shrink-0 rounded-full border-[1.5px] ${
                last ? "border-ink bg-ink" : "border-navy-700 bg-surface"
              }`}
            />
            <div className="min-w-0">
              <p className="text-small text-ink">{event.message}</p>
              <p className="text-caption text-ink-faint">
                <time dateTime={event.createdAt.toISOString()}>{formatDateTime(event.createdAt)}</time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
