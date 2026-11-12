import { formatDateTime } from "@/lib/format";

export type TimelineEvent = {
  id: string;
  message: string;
  createdAt: Date;
};

/**
 * Workflow history, newest last. Rows come from the append-only
 * WorkflowEvent table, so this is a faithful record of what happened.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-small text-ink-soft">Nothing has happened yet.</p>;
  }
  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="relative flex gap-3 pl-0.5">
          <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-navy-700" />
          <div>
            <p className="text-body text-ink">{event.message}</p>
            <p className="text-caption text-ink-faint">
              <time dateTime={event.createdAt.toISOString()}>{formatDateTime(event.createdAt)}</time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
