import { Lock, Search, ShieldCheck } from "lucide-react";
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
      <section className="overflow-x-clip border-b border-line">
        <div className="container-page grid gap-12 py-12 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:py-20">
          <div>
            <h1 className="type-display">Lost it on campus? It may already be waiting for you.</h1>
            <p className="mt-5 max-w-xl text-lead text-ink-soft">
              CampusTrace is where {CAMPUS_NAME} students hand in what they find and trace what
              they have lost. Every return goes through a staffed collection point, so items reach
              the person who can prove they own them.
            </p>

            <form action="/browse" role="search" className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row">
              <label htmlFor="hero-search" className="sr-only">
                Search found and lost items
              </label>
              <div className="relative flex-1">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="hero-search"
                  name="q"
                  type="search"
                  placeholder="Try “keys” or “Science Market”"
                  className="field-input pl-10"
                />
              </div>
              <button type="submit" className="btn btn-navy">
                Search items
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/report/found" className="btn btn-primary">
                I found something
              </Link>
              <Link href="/report/lost" className="btn btn-secondary">
                I lost something
              </Link>
            </div>
          </div>

          {heroCards.length > 0 && (
            <div className="mx-auto w-full max-w-md lg:max-w-none">
              <h2 className="sr-only">Newest reports</h2>
              <HeroTags
                tags={heroCards.map((card) => ({
                  id: card.id,
                  node: <ItemTag card={card} headingLevel="h3" />,
                }))}
              />
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-b border-line bg-surface">
        <div className="container-page py-14 lg:py-16">
          <div className="max-w-2xl">
            <h2 className="type-page">How a return works</h2>
            <p className="mt-3 text-lead text-ink-soft">
              Six steps take an item from the person who found it to the person who owns it.
              {returnedCount > 0 &&
                ` ${returnedCount} ${returnedCount === 1 ? "item has" : "items have"} made the trip so far.`}
            </p>
          </div>

          <div className="mt-10">
            <JourneyTrack steps={journey} mode="explain" />
          </div>

          <div className="mt-12 grid gap-8 border-t border-line pt-8 md:grid-cols-2">
            <div className="flex gap-4">
              <ShieldCheck aria-hidden className="mt-1 size-6 shrink-0 text-brand-700" />
              <div>
                <h3 className="type-card">Custody comes before collection</h3>
                <p className="mt-1 text-ink-soft">
                  You can claim an item as soon as it is reported, and the desk can review your
                  evidence straight away. A collection time is only set once the desk is holding
                  the item, so you never travel for something that is not there.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Lock aria-hidden className="mt-1 size-6 shrink-0 text-brand-700" />
              <div>
                <h3 className="type-card">Your proof stays private</h3>
                <p className="mt-1 text-ink-soft">
                  Finders keep identifying details out of the public report. Owners describe those
                  details in a claim that only desk staff can read. The finder never sees who
                  claimed an item or what they wrote.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pt-14">
        <SectionHeading title="Recently found" href="/browse?kind=FOUND" linkLabel="See all found items" />
        {moreFound.length > 0 ? (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {moreFound.map((card) => (
              <li key={card.id}>
                <ItemTag card={card} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-ink-soft">
            No other found items are waiting right now.{" "}
            <Link href="/report/found" className="link">
              Report one you have found
            </Link>
            .
          </p>
        )}
      </section>

      <section className="container-page pt-14">
        <SectionHeading title="Students are looking for" href="/browse?kind=LOST" linkLabel="See all lost items" />
        {moreLost.length > 0 ? (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {moreLost.map((card) => (
              <li key={card.id}>
                <ItemTag card={card} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-ink-soft">
            Nobody else is looking for anything right now.{" "}
            <Link href="/report/lost" className="link">
              Report something you have lost
            </Link>
            .
          </p>
        )}
      </section>
    </>
  );
}

function SectionHeading({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <h2 className="type-section">{title}</h2>
      <Link href={href} className="link text-small">
        {linkLabel}
      </Link>
    </div>
  );
}
