import type { Metadata } from "next";
import Link from "next/link";
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
    <li key={claim.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <p className="font-bold">
          <Link href={`/claims/${claim.id}`} className="hover:underline">
            {claim.report.title}
          </Link>
        </p>
        <p className="text-small text-ink-soft">
          <span className="type-reference">{claim.reference}</span>, {claim.claimant.name}. {detail}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge {...claimStatusLabel(claim.status)} />
        <Link href={`/claims/${claim.id}`} className="btn btn-secondary btn-small">
          Open<span className="sr-only"> claim {claim.reference}</span>
        </Link>
      </div>
    </li>
  );

  return (
    <div className="container-page py-10">
      <h1 className="type-page">Collection desk</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Work through the queues from top to bottom. {unclaimed}{" "}
        {unclaimed === 1 ? "item in custody has" : "items in custody have"} no open claim.
      </p>

      <nav aria-label="Queues" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <QueueLink href="#drop-off" count={awaitingDropOff.length} label="Awaiting drop-off" />
        <QueueLink href="#review" count={toReview.length} label="Claims to review" />
        <QueueLink href="#blocked" count={blocked.length} label="Waiting for item" />
        <QueueLink href="#schedule" count={toSchedule.length} label="Ready to schedule" />
        <QueueLink href="#collections" count={scheduled.length} label="Collections booked" />
        <QueueLink href="#receipt" count={awaitingReceipt.length} label="Awaiting receipt" />
      </nav>

      <Queue
        id="drop-off"
        title="Awaiting drop-off"
        intro="Reported as found, but the finder still has the item. Record custody when it is handed in."
        empty="No finders are on their way."
      >
        {awaitingDropOff.map((report) => (
          <li key={report.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <p className="font-bold">
                <Link href={`/reports/${report.id}`} className="hover:underline">
                  {report.title}
                </Link>
              </p>
              <p className="text-small text-ink-soft">
                <span className="type-reference">{report.reference}</span>, reported{" "}
                {formatDate(report.createdAt)}. Expected at {report.dropOffPoint?.name ?? "a collection point"}.
                {report._count.claims > 0 && ` ${report._count.claims} claim${report._count.claims === 1 ? "" : "s"} waiting.`}
              </p>
            </div>
            <Link href={`/reports/${report.id}`} className="btn btn-secondary btn-small">
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
  );
}

function QueueLink({ href, count, label }: { href: string; count: number; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-lg border p-3 transition-colors hover:border-navy-700 ${
        count > 0 ? "border-line-strong bg-surface" : "border-line bg-paper text-ink-soft"
      }`}
    >
      <span className="type-section block">{count}</span>
      <span className="text-small font-bold">{label}</span>
    </a>
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
    <section id={id} className="mt-12 scroll-mt-24">
      <h2 className="type-section">{title}</h2>
      <p className="mt-1 text-ink-soft">{intro}</p>
      {children.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-line-strong px-5 py-4 text-ink-soft">{empty}</p>
      ) : (
        <ul className="panel mt-4 divide-y divide-line">{children}</ul>
      )}
    </section>
  );
}
