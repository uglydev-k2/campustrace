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
    <article className="group relative flex h-full flex-col rounded-lg border border-line bg-surface shadow-tag transition-[border-color,box-shadow] duration-200 focus-within:border-brand-600 focus-within:ring-3 focus-within:ring-brand-600/15 hover:border-line-strong hover:shadow-lift">
      <div
        className={`flex items-center gap-2 rounded-t-[10px] px-3.5 py-2 ${found ? "bg-brand-50/70" : "bg-lost-50"}`}
      >
        <span aria-hidden className="tag-hole" />
        <span className={`text-caption font-medium ${found ? "text-brand-800" : "text-lost-800"}`}>
          {kindLabel(card.kind)}
        </span>
        <span className="type-reference ml-auto text-[0.75rem] text-ink-faint">{card.reference}</span>
      </div>
      <div aria-hidden className="tag-perforation" />

      <div className="flex flex-1 gap-3.5 p-3.5">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-sunken text-ink-faint ring-1 ring-line ring-inset">
          {card.photoId ? (
            // Served by /api/files after a permission check, so next/image's
            // optimiser (which fetches without the viewer's cookie) cannot be used.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${card.photoId}`}
              alt=""
              loading="lazy"
              decoding="async"
              width={64}
              height={64}
              className="size-full object-cover"
            />
          ) : (
            <CategoryIcon category={card.category} className="size-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Heading className="type-card line-clamp-2">
            {/* The stretched ::after makes the whole tag one click target. */}
            <Link
              href={`/reports/${card.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-lg"
            >
              {card.title}
            </Link>
          </Heading>
          <dl className="mt-1.5 space-y-0.5 text-caption text-ink-soft">
            <div className="flex items-center gap-1.5">
              <dt>
                <MapPin aria-hidden className="size-3.5 shrink-0 text-ink-faint" />
                <span className="sr-only">Where</span>
              </dt>
              <dd className="truncate">{card.area}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt>
                <CalendarDays aria-hidden className="size-3.5 shrink-0 text-ink-faint" />
                <span className="sr-only">When</span>
              </dt>
              <dd>
                {found ? "Found" : "Lost"} {formatDate(card.occurredOn)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="px-3.5 pb-3.5">
        <StatusBadge {...status} />
      </div>
    </article>
  );
}
