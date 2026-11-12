import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ItemTag } from "@/components/item-tag";
import { ResultsGrid } from "@/components/results-grid";
import { getCurrentUser } from "@/lib/auth";
import { CAMPUS_AREAS, CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { browseSchema, type BrowseFilters } from "@/lib/validation";
import { searchReports } from "@/server/queries";

export const metadata: Metadata = { title: "Browse items" };

/** Builds a /browse URL that keeps the current filters and changes some. */
function browseHref(filters: BrowseFilters, changes: Partial<BrowseFilters>): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.kind !== "ALL") params.set("kind", next.kind);
  if (next.category !== "ALL") params.set("category", next.category);
  if (next.area !== "ALL") params.set("area", next.area);
  if (next.show !== "OPEN") params.set("show", next.show);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/browse?${query}` : "/browse";
}

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  // Anything odd in the query string falls back to a safe default.
  const filters = browseSchema.parse(await searchParams);
  const viewer = await getCurrentUser();
  const { cards, total, pages } = await searchReports(filters, viewer);

  const filtered =
    filters.q !== "" ||
    filters.kind !== "ALL" ||
    filters.category !== "ALL" ||
    filters.area !== "ALL" ||
    filters.show !== "OPEN";

  return (
    <div className="container-page py-10">
      <h1 className="type-page">Browse items</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Search what has been found and what students are looking for. Identifying details are
        left out on purpose: you prove an item is yours when you claim it.
      </p>

      {/* A plain GET form: it works without JavaScript and the URL can be shared. */}
      <form action="/browse" role="search" className="panel mt-8 grid gap-4 p-4 sm:p-5 md:grid-cols-12">
        <div className="md:col-span-12 lg:col-span-4">
          <label htmlFor="q" className="field-label">
            Search
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Item, place or reference"
              className="field-input pl-10"
            />
          </div>
        </div>

        <div className="md:col-span-3 lg:col-span-2">
          <label htmlFor="kind" className="field-label">
            Type
          </label>
          <select id="kind" name="kind" defaultValue={filters.kind} className="field-input">
            <option value="ALL">Found and lost</option>
            <option value="FOUND">Found items</option>
            <option value="LOST">Lost items</option>
          </select>
        </div>

        <div className="md:col-span-3 lg:col-span-2">
          <label htmlFor="category" className="field-label">
            Category
          </label>
          <select id="category" name="category" defaultValue={filters.category} className="field-input">
            <option value="ALL">Any category</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 lg:col-span-2">
          <label htmlFor="area" className="field-label">
            Place
          </label>
          <select id="area" name="area" defaultValue={filters.area} className="field-input">
            <option value="ALL">Anywhere on campus</option>
            {CAMPUS_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 lg:col-span-2">
          <label htmlFor="show" className="field-label">
            Show
          </label>
          <select id="show" name="show" defaultValue={filters.show} className="field-input">
            <option value="OPEN">Still open</option>
            <option value="RETURNED">Already returned</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:col-span-12">
          <button type="submit" className="btn btn-navy">
            Search items
          </button>
          {filtered && (
            <Link href="/browse" className="btn btn-ghost">
              Clear filters
            </Link>
          )}
        </div>
      </form>

      <p aria-live="polite" className="mt-8 font-bold">
        {total === 0 ? "No items match" : `${total} ${total === 1 ? "item" : "items"}`}
        {filters.q && <span className="font-normal text-ink-soft"> for “{filters.q}”</span>}
      </p>

      {cards.length > 0 ? (
        <ResultsGrid
          items={cards.map((card) => ({
            id: card.id,
            node: <ItemTag card={card} headingLevel="h2" />,
          }))}
        />
      ) : (
        <div className="panel mt-4 p-8">
          <h2 className="type-card">Nothing here yet</h2>
          <p className="mt-2 max-w-xl text-ink-soft">
            {filtered
              ? "Try a broader search: fewer words, any category, or anywhere on campus."
              : "No reports are open at the moment."}{" "}
            If you have lost something, report it so finders and the desk know to look for it.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/report/lost" className="btn btn-primary">
              Report a lost item
            </Link>
            <Link href="/report/found" className="btn btn-secondary">
              Report a found item
            </Link>
          </div>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-between gap-4">
          {filters.page > 1 ? (
            <Link href={browseHref(filters, { page: filters.page - 1 })} className="btn btn-secondary">
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <p className="text-small text-ink-soft">
            Page {filters.page} of {pages}
          </p>
          {filters.page < pages ? (
            <Link href={browseHref(filters, { page: filters.page + 1 })} className="btn btn-secondary">
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
