import { ChevronRight, FileText, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ItemTag } from "@/components/item-tag";
import { Notice } from "@/components/notice";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { claimStatusLabel } from "@/lib/labels";
import type { ClaimStatus, ReportStatus } from "@/lib/workflow/rules";
import { reportsByUser } from "@/server/queries";

export const metadata: Metadata = { title: "My activity" };

/** One line telling the claimant what, if anything, they need to do. */
function claimHint(status: ClaimStatus, reportStatus: ReportStatus, collectionAt: Date | null): string {
  switch (status) {
    case "SUBMITTED":
      return "The desk is reviewing your evidence.";
    case "APPROVED":
      return reportStatus === "IN_CUSTODY"
        ? "Approved. The desk will set a collection time."
        : "Approved. Waiting for the finder to hand the item in.";
    case "COLLECTION_SCHEDULED":
      return collectionAt ? `Collect it on ${formatDateTime(collectionAt)}.` : "Collection arranged.";
    case "HANDED_OVER":
      return "Action needed: confirm that you have your item.";
    case "COMPLETED":
      return "Returned and confirmed.";
    case "REJECTED":
      return "Not approved. Open the claim to read the desk's note.";
    default:
      return "You withdrew this claim.";
  }
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const { notice } = await searchParams;

  const [reports, claims] = await Promise.all([
    reportsByUser(user.id, user),
    db.claim.findMany({
      where: { claimantId: user.id },
      select: {
        id: true,
        reference: true,
        status: true,
        collectionAt: true,
        createdAt: true,
        report: { select: { title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Everything you have reported or claimed is listed here."
        actions={
          <>
            <Link href="/report/found" className="btn btn-primary">
              I found something
            </Link>
            <Link href="/report/lost" className="btn btn-secondary">
              I lost something
            </Link>
          </>
        }
      />

      <div className="container-page space-y-12 pt-8">
        <Notice code={typeof notice === "string" ? notice : undefined} />

        <section>
          <SectionTitle title="My claims" count={claims.length} />
          {claims.length === 0 ? (
            <EmptyState
              icon={<Inbox aria-hidden className="size-5" />}
              title="No claims yet"
              actions={
                <Link href="/browse?kind=FOUND" className="btn btn-secondary">
                  Browse found items
                </Link>
              }
            >
              You have not claimed anything. If you have lost something, see whether it has been
              handed in.
            </EmptyState>
          ) : (
            <ul className="panel divide-y divide-line overflow-hidden shadow-xs">
              {claims.map((claim) => (
                <li
                  key={claim.id}
                  className="group relative flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 transition-colors focus-within:bg-paper hover:bg-paper sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="type-card">
                      <Link href={`/claims/${claim.id}`} className="after:absolute after:inset-0">
                        {claim.report.title}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-caption text-ink-faint">
                      <span className="type-reference">{claim.reference}</span>, submitted{" "}
                      {formatDate(claim.createdAt)}
                    </p>
                    <p
                      className={`mt-1.5 text-small ${claim.status === "HANDED_OVER" ? "font-medium text-brand-800" : "text-ink-soft"}`}
                    >
                      {claimHint(claim.status, claim.report.status, claim.collectionAt)}
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
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle title="My reports" count={reports.length} />
          {reports.length === 0 ? (
            <EmptyState icon={<FileText aria-hidden className="size-5" />} title="No reports yet">
              You have not reported anything yet. Reports you publish appear here so you can follow
              them.
            </EmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((card) => (
                <li key={card.id}>
                  <ItemTag card={card} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <h2 className="type-section">{title}</h2>
      {count > 0 && (
        <span className="rounded-sm bg-surface px-1.5 py-0.5 text-caption font-medium text-ink-soft tabular-nums ring-1 ring-line ring-inset">
          {count}
        </span>
      )}
    </div>
  );
}
