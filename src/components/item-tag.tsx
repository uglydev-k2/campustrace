import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { kindLabel, reportStatusLabel } from "@/lib/labels";
import type { ReportCard } from "@/server/queries";

/**
 * A report drawn as a property tag.
 *
 * The stub at the top (punched hole, kind, reference code) is separated from
 * the body by a perforated line, like the tag a lost-property desk ties to an
 * item. Teal stubs are found items; amber stubs are lost items.
 */
export function ItemTag({ card, headingLevel = "h3" }: { card: ReportCard; headingLevel?: "h2" | "h3" }) {
  const found = card.kind === "FOUND";
  const status = reportStatusLabel(card.kind, card.status);
  const Heading = headingLevel;

  return (
    <article className="relative flex h-full flex-col rounded-lg border border-line bg-surface shadow-tag transition-colors duration-150 focus-within:border-navy-700 hover:border-navy-700">
      <div
        className={`flex items-center gap-2.5 rounded-t-lg px-4 py-2.5 ${found ? "bg-brand-50" : "bg-lost-50"}`}
      >
        <span aria-hidden className="tag-hole" />
        <span className={`text-small font-bold ${found ? "text-brand-800" : "text-lost-800"}`}>
          {kindLabel(card.kind)}
        </span>
        <span className="type-reference ml-auto text-caption text-ink-soft">{card.reference}</span>
      </div>
      <div aria-hidden className="tag-perforation" />

      <div className="flex flex-1 gap-4 p-4">
        <div
          className={`grid size-18 shrink-0 place-items-center overflow-hidden rounded-md border ${
            found ? "border-brand-100 bg-brand-50 text-brand-700" : "border-lost-100 bg-lost-50 text-lost-700"
          }`}
        >
          {card.photoId ? (
            // Served by /api/files after a permission check, so next/image's
            // optimiser (which fetches without the viewer's cookie) cannot be used.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${card.photoId}`}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <CategoryIcon category={card.category} className="size-8" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Heading className="type-card">
            {/* The stretched ::after makes the whole tag one click target. */}
            <Link
              href={`/reports/${card.id}`}
              className="after:absolute after:inset-0 after:rounded-lg"
            >
              {card.title}
            </Link>
          </Heading>
          <dl className="mt-2 space-y-1 text-small text-ink-soft">
            <div className="flex items-start gap-1.5">
              <dt>
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span className="sr-only">Where</span>
              </dt>
              <dd>{card.area}</dd>
            </div>
            <div className="flex items-start gap-1.5">
              <dt>
                <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span className="sr-only">When</span>
              </dt>
              <dd>
                {found ? "Found" : "Lost"} {formatDate(card.occurredOn)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="px-4 pb-4">
        <StatusBadge {...status} />
      </div>
    </article>
  );
}
