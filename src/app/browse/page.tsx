import { ChevronLeft, ChevronRight, Search, SearchX, X } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { AutoSubmit } from "@/components/auto-submit";
import { EmptyState, PageHeader } from "@/components/page-header";
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

  const kinds = [
    { value: "ALL", label: "All" },
    { value: "FOUND", label: "Found" },
    { value: "LOST", label: "Lost" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Browse items"
        description="Search what has been found and what students are looking for. Identifying details are left out on purpose: you prove an item is yours when you claim it."
      >
        {/* A GET form: it works without JavaScript and the URL can be shared.
            next/form turns submissions into client-side navigations. */}
        <Form action="/browse" role="search" className="mt-8 space-y-3">
          <AutoSubmit />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="q" className="sr-only">
                Search
              </label>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={filters.q}
                  placeholder="Search by item, place or reference"
                  className="field-input pl-9"
                />
              </div>
            </div>
            <fieldset className="shrink-0">
              <legend className="sr-only">Type</legend>
              <div className="grid h-10 grid-cols-3 rounded-md bg-sunken p-1 ring-1 ring-line ring-inset">
                {kinds.map((kind) => (
                  <label
                    key={kind.value}
                    className="relative grid cursor-pointer place-items-center rounded-[5px] px-4 text-small font-medium text-ink-soft transition-[color,background-color,box-shadow] duration-200 hover:text-ink has-checked:bg-surface has-checked:text-ink has-checked:shadow-xs has-checked:ring-1 has-checked:ring-line has-focus-visible:outline-2 has-focus-visible:outline-brand-600"
                  >
                    <input
                      type="radio"
                      name="kind"
                      value={kind.value}
                      defaultChecked={filters.kind === kind.value}
                      className="sr-only"
                    />
                    {kind.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label htmlFor="category" className="sr-only">
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
            <div>
              <label htmlFor="area" className="sr-only">
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
            <div>
              <label htmlFor="show" className="sr-only">
                Show
              </label>
              <select id="show" name="show" defaultValue={filters.show} className="field-input">
                <option value="OPEN">Still open</option>
                <option value="RETURNED">Already returned</option>
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-3 lg:col-span-1">
              <button type="submit" className="btn btn-navy flex-1 lg:flex-none">
                Search items
              </button>
              {filtered && (
                <Link href="/browse" className="btn btn-ghost">
                  <X aria-hidden className="size-4" />
                  Clear filters
                </Link>
              )}
            </div>
          </div>
        </Form>
      </PageHeader>

      <div className="container-page pt-8">
        <p aria-live="polite" className="text-small font-medium text-ink">
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
          <div className="mt-4">
            <EmptyState
              icon={<SearchX aria-hidden className="size-5" />}
              title="Nothing here yet"
              actions={
                <>
                  <Link href="/report/lost" className="btn btn-primary">
                    Report a lost item
                  </Link>
                  <Link href="/report/found" className="btn btn-secondary">
                    Report a found item
                  </Link>
                </>
              }
            >
              {filtered
                ? "Try a broader search: fewer words, any category, or anywhere on campus."
                : "No reports are open at the moment."}{" "}
              If you have lost something, report it so finders and the desk know to look for it.
            </EmptyState>
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Pages" className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
            {filters.page > 1 ? (
              <Link href={browseHref(filters, { page: filters.page - 1 })} className="btn btn-secondary">
                <ChevronLeft aria-hidden className="size-4" />
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
                <ChevronRight aria-hidden className="size-4" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </>
  );
}
