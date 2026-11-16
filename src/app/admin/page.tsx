import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { claimStatusLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Desk" };

const claimSelect = {
  id: true,
  reference: true,
  status: true,
  createdAt: true,
  collectionAt: true,
  claimant: { select: { name: true } },
  report: { select: { id: true, title: true, reference: true, custodyTag: true } },
} as const;

/**
 * The desk's work queues. Each queue is one question the desk has to answer,
 * in the order an item moves through the workflow.
 */
export default async function AdminPage() {
  await requireAdmin("/admin");

  const [awaitingDropOff, toReview, blocked, toSchedule, scheduled, awaitingReceipt, unclaimed] =
    await Promise.all([
      db.report.findMany({
        where: { kind: "FOUND", status: "OPEN" },
        select: {
          id: true,
          reference: true,
          title: true,
          createdAt: true,
          dropOffPoint: { select: { name: true } },
          _count: { select: { claims: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      db.claim.findMany({ where: { status: "SUBMITTED" }, select: claimSelect, orderBy: { createdAt: "asc" } }),
      db.claim.findMany({
        where: { status: "APPROVED", report: { status: "OPEN" } },
        select: claimSelect,
        orderBy: { createdAt: "asc" },
      }),
      db.claim.findMany({
        where: { status: "APPROVED", report: { status: "IN_CUSTODY" } },
        select: claimSelect,
        orderBy: { createdAt: "asc" },
      }),
      db.claim.findMany({
        where: { status: "COLLECTION_SCHEDULED" },
        select: claimSelect,
        orderBy: { collectionAt: "asc" },
      }),
      db.claim.findMany({ where: { status: "HANDED_OVER" }, select: claimSelect, orderBy: { handedOverAt: "asc" } }),
      db.report.count({
        where: { kind: "FOUND", status: "IN_CUSTODY", claims: { none: { status: { in: ["SUBMITTED", "APPROVED", "COLLECTION_SCHEDULED"] } } } },
      }),
    ]);

  type ClaimRow = (typeof toReview)[number];
  const claimRow = (claim: ClaimRow, detail: string) => (
    <li
      key={claim.id}
      className="group relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3.5 transition-colors focus-within:bg-paper hover:bg-paper sm:px-5"
    >
      <div className="min-w-0">
        <p className="text-small font-medium text-ink">
          <Link href={`/claims/${claim.id}`} className="after:absolute after:inset-0">
            {claim.report.title}
          </Link>
        </p>
        <p className="mt-0.5 text-caption text-ink-soft">
          <span className="type-reference text-ink-faint">{claim.reference}</span> {claim.claimant.name}. {detail}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge {...claimStatusLabel(claim.status)} />
        <ChevronRight
          aria-hidden
          className="size-4 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </li>
  );

  return (
    <>
      <PageHeader
        title="Collection desk"
        description={`Work through the queues from top to bottom. ${unclaimed} ${
          unclaimed === 1 ? "item in custody has" : "items in custody have"
        } no open claim.`}
      >
        <nav aria-label="Queues" className="mt-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ol className="grid min-w-[40rem] grid-cols-6 divide-x divide-line overflow-hidden rounded-lg border border-line bg-paper">
            <QueueLink step={1} href="#drop-off" count={awaitingDropOff.length} label="Awaiting drop-off" />
            <QueueLink step={2} href="#review" count={toReview.length} label="Claims to review" />
            <QueueLink step={3} href="#blocked" count={blocked.length} label="Waiting for item" />
            <QueueLink step={4} href="#schedule" count={toSchedule.length} label="Ready to schedule" />
            <QueueLink step={5} href="#collections" count={scheduled.length} label="Collections booked" />
            <QueueLink step={6} href="#receipt" count={awaitingReceipt.length} label="Awaiting receipt" />
          </ol>
        </nav>
      </PageHeader>

    <div className="container-page space-y-6 pt-8">

      <Queue
        id="drop-off"
        title="Awaiting drop-off"
        intro="Reported as found, but the finder still has the item. Record custody when it is handed in."
        empty="No finders are on their way."
      >
        {awaitingDropOff.map((report) => (
          <li
            key={report.id}
            className="group relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3.5 transition-colors focus-within:bg-paper hover:bg-paper sm:px-5"
          >
            <div className="min-w-0">
              <p className="text-small font-medium text-ink">
                <Link href={`/reports/${report.id}`} className="after:absolute after:inset-0">
                  {report.title}
                </Link>
              </p>
              <p className="mt-0.5 text-caption text-ink-soft">
                <span className="type-reference text-ink-faint">{report.reference}</span> Reported{" "}
                {formatDate(report.createdAt)}. Expected at {report.dropOffPoint?.name ?? "a collection point"}.
                {report._count.claims > 0 && ` ${report._count.claims} claim${report._count.claims === 1 ? "" : "s"} waiting.`}
              </p>
            </div>
            <Link href={`/reports/${report.id}`} className="btn btn-secondary btn-small relative z-10">
              Record custody<span className="sr-only"> for {report.reference}</span>
            </Link>
          </li>
        ))}
      </Queue>

      <Queue
        id="review"
        title="Claims to review"
        intro="Compare each claimant's description with the finder's private notes."
        empty="No claims are waiting for a decision."
      >
        {toReview.map((claim) => claimRow(claim, `Submitted ${formatDate(claim.createdAt)}.`))}
      </Queue>

      <Queue
        id="blocked"
        title="Approved, waiting for the item"
        intro="These owners are verified, but collection is blocked until the finder hands the item in."
        empty="No approved claim is waiting for its item."
      >
        {blocked.map((claim) => claimRow(claim, "Custody not recorded yet."))}
      </Queue>

      <Queue
        id="schedule"
        title="Ready to schedule"
        intro="Approved and in custody. Set a collection time."
        empty="Nothing is waiting for a collection time."
      >
        {toSchedule.map((claim) => claimRow(claim, `Shelf ${claim.report.custodyTag ?? "not recorded"}.`))}
      </Queue>

      <Queue
        id="collections"
        title="Collections booked"
        intro="Record the handover when the owner arrives with their student ID."
        empty="No collections are booked."
      >
        {scheduled.map((claim) =>
          claimRow(
            claim,
            `${claim.collectionAt ? formatDateTime(claim.collectionAt) : "Time not set"}, shelf ${claim.report.custodyTag ?? "not recorded"}.`,
          ),
        )}
      </Queue>

      <Queue
        id="receipt"
        title="Awaiting receipt"
        intro="Handed over. Waiting for the owner to confirm in the app."
        empty="Every handover has been confirmed."
      >
        {awaitingReceipt.map((claim) => claimRow(claim, "Handed over."))}
      </Queue>
    </div>
    </>
  );
}

/** One cell of the queue strip: the queue's place in the workflow, its size and name. */
function QueueLink({ step, href, count, label }: { step: number; href: string; count: number; label: string }) {
  const busy = count > 0;
  return (
    <li className="first:rounded-l-lg last:rounded-r-lg">
      <a
        href={href}
        className={`group flex h-full flex-col gap-3 p-3.5 transition-colors first:rounded-l-lg hover:bg-surface ${
          busy ? "bg-surface" : ""
        }`}
      >
        <span className="flex items-center justify-between">
          <span className="type-reference text-[0.6875rem] text-ink-faint">{step}</span>
          {busy && <span aria-hidden className="size-1.5 rounded-full bg-brand-600" />}
        </span>
        <span>
          <span
            className={`block text-[1.375rem] leading-none font-semibold tracking-tight tabular-nums ${
              busy ? "text-ink" : "text-ink-faint"
            }`}
          >
            {count}
          </span>
          <span className={`mt-1 block text-caption ${busy ? "text-ink-soft" : "text-ink-faint"}`}>{label}</span>
        </span>
      </a>
    </li>
  );
}

function Queue({
  id,
  title,
  intro,
  empty,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section id={id} className="panel scroll-mt-20 overflow-hidden shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="type-card">{title}</h2>
            <span className="rounded-sm bg-sunken px-1.5 py-px text-caption font-medium text-ink-soft tabular-nums">
              {children.length}
            </span>
          </div>
          <p className="mt-0.5 text-caption text-ink-soft">{intro}</p>
        </div>
      </div>
      {children.length === 0 ? (
        <p className="px-4 py-5 text-small text-ink-faint sm:px-5">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">{children}</ul>
      )}
    </section>
  );
}
