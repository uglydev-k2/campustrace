import { ChevronRight, Lock, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { HeroTags } from "@/components/hero-tags";
import { ItemTag } from "@/components/item-tag";
import { JourneyTrack } from "@/components/journey-track";
import { getCurrentUser } from "@/lib/auth";
import { CAMPUS_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { JOURNEY_TEMPLATE } from "@/lib/workflow/journey";
import { recentReports } from "@/server/queries";

export default async function HomePage() {
  const viewer = await getCurrentUser();
  const [found, lost, returnedCount] = await Promise.all([
    recentReports("FOUND", 8, viewer),
    recentReports("LOST", 4, viewer),
    db.report.count({ where: { kind: "FOUND", status: "RETURNED" } }),
  ]);

  // The hero shows the two newest found items and the newest lost one;
  // the lists further down show the rest.
  const heroCards = [found[0], lost[0], found[1]].filter((card) => card !== undefined);
  const heroIds = new Set(heroCards.map((card) => card.id));
  const moreFound = found.filter((card) => !heroIds.has(card.id)).slice(0, 6);
  const moreLost = lost.filter((card) => !heroIds.has(card.id)).slice(0, 3);

  const journey = JOURNEY_TEMPLATE.map((step) => ({ ...step, done: false }));

  return (
    <>
      <section className="overflow-x-clip border-b border-line bg-surface">
        <div className="container-page grid grid-cols-1 gap-12 pt-12 pb-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-20 lg:pt-20 lg:pb-24">
          <div className="max-w-xl">
            <h1 className="type-display">Lost it on campus? It may already be waiting for you.</h1>
            <p className="mt-5 text-lead text-ink-soft">
              CampusTrace is where {CAMPUS_NAME} students hand in what they find and trace what
              they have lost. Every return goes through a staffed collection point, so items reach
              the person who can prove they own them.
            </p>

            <form
              action="/browse"
              role="search"
              className="mt-8 flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface p-1.5 shadow-xs transition-[border-color,box-shadow] focus-within:border-brand-600 focus-within:shadow-[0_0_0_3px_rgb(10_122_114/0.16)] hover:border-navy-700"
            >
              <label htmlFor="hero-search" className="sr-only">
                Search found and lost items
              </label>
              <Search aria-hidden className="ml-2 size-[1.125rem] shrink-0 text-ink-faint" />
              <input
                id="hero-search"
                name="q"
                type="search"
                placeholder="Try “keys” or “Science Market”"
                className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-body text-ink outline-none placeholder:text-ink-faint"
              />
              <button type="submit" className="btn btn-navy shrink-0">
                Search items
              </button>
            </form>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Link href="/report/found" className="btn btn-primary">
                I found something
              </Link>
              <Link href="/report/lost" className="btn btn-secondary">
                I lost something
              </Link>
            </div>
          </div>

          {heroCards.length > 0 && (
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div
                aria-hidden
                className="absolute -inset-x-2 -inset-y-5 -z-0 rounded-[18px] border border-line bg-paper sm:-inset-x-6 sm:-inset-y-8 lg:-inset-x-10"
              />
              <h2 className="sr-only">Newest reports</h2>
              <div className="relative">
                <HeroTags
                  tags={heroCards.map((card) => ({
                    id: card.id,
                    node: <ItemTag card={card} headingLevel="h3" />,
                  }))}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20">
        <div className="container-page py-16 lg:py-20">
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div>
              <h2 className="type-page">How a return works</h2>
              <p className="mt-3 text-ink-soft">
                Six steps take an item from the person who found it to the person who owns it.
                {returnedCount > 0 &&
                  ` ${returnedCount} ${returnedCount === 1 ? "item has" : "items have"} made the trip so far.`}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Principle icon={<ShieldCheck aria-hidden className="size-4" />} title="Custody comes before collection">
                You can claim an item as soon as it is reported, and the desk can review your
                evidence straight away. A collection time is only set once the desk is holding the
                item, so you never travel for something that is not there.
              </Principle>
              <Principle icon={<Lock aria-hidden className="size-4" />} title="Your proof stays private">
                Finders keep identifying details out of the public report. Owners describe those
                details in a claim that only desk staff can read. The finder never sees who claimed
                an item or what they wrote.
              </Principle>
            </div>
          </div>

          <div className="panel mt-10 p-5 sm:p-7">
            <JourneyTrack steps={journey} mode="explain" />
          </div>
        </div>
      </section>

      <section className="container-page">
        <SectionHeading title="Recently found" href="/browse?kind=FOUND" linkLabel="See all found items" />
        {moreFound.length > 0 ? (
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moreFound.map((card) => (
              <li key={card.id}>
                <ItemTag card={card} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRow>
            No other found items are waiting right now.{" "}
            <Link href="/report/found" className="link">
              Report one you have found
            </Link>
            .
          </EmptyRow>
        )}
      </section>

      <section className="container-page pt-14">
        <SectionHeading title="Students are looking for" href="/browse?kind=LOST" linkLabel="See all lost items" />
        {moreLost.length > 0 ? (
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moreLost.map((card) => (
              <li key={card.id}>
                <ItemTag card={card} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRow>
            Nobody else is looking for anything right now.{" "}
            <Link href="/report/lost" className="link">
              Report something you have lost
            </Link>
            .
          </EmptyRow>
        )}
      </section>
    </>
  );
}

function Principle({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface text-brand-700 shadow-xs">
        {icon}
      </span>
      <div>
        <h3 className="type-card">{title}</h3>
        <p className="mt-1 text-small text-ink-soft">{children}</p>
      </div>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 rounded-lg border border-dashed border-line-strong px-5 py-6 text-small text-ink-soft">
      {children}
    </p>
  );
}

function SectionHeading({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b border-line pb-3">
      <h2 className="type-section">{title}</h2>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 text-small font-medium text-ink-soft transition-colors hover:text-ink"
      >
        {linkLabel}
        <ChevronRight
          aria-hidden
          className="size-4 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
