import type { Metadata } from "next";
import Link from "next/link";
import { ItemTag } from "@/components/item-tag";
import { Notice } from "@/components/notice";
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
    <div className="container-page py-10">
      <Notice code={typeof notice === "string" ? notice : undefined} />
      <h1 className="type-page">Welcome back, {firstName}</h1>
      <p className="mt-2 text-ink-soft">Everything you have reported or claimed is listed here.</p>

      <section className="mt-10">
        <h2 className="type-section">My claims</h2>
        {claims.length === 0 ? (
          <div className="panel mt-4 p-6">
            <p className="text-ink-soft">
              You have not claimed anything. If you have lost something, see whether it has been
              handed in.
            </p>
            <Link href="/browse?kind=FOUND" className="btn btn-secondary mt-4">
              Browse found items
            </Link>
          </div>
        ) : (
          <ul className="panel mt-4 divide-y divide-line">
            {claims.map((claim) => (
              <li key={claim.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-4 sm:px-5">
                <div className="min-w-0">
                  <p className="type-card">
                    <Link href={`/claims/${claim.id}`} className="hover:underline">
                      {claim.report.title}
                    </Link>
                  </p>
                  <p className="text-small text-ink-soft">
                    <span className="type-reference">{claim.reference}</span>, submitted{" "}
                    {formatDate(claim.createdAt)}
                  </p>
                  <p className={`mt-1 text-small ${claim.status === "HANDED_OVER" ? "font-bold text-brand-800" : "text-ink-soft"}`}>
                    {claimHint(claim.status, claim.report.status, claim.collectionAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge {...claimStatusLabel(claim.status)} />
                  <Link href={`/claims/${claim.id}`} className="btn btn-secondary btn-small">
                    Open<span className="sr-only"> claim on {claim.report.title}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-section">My reports</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/report/found" className="btn btn-primary btn-small">
              I found something
            </Link>
            <Link href="/report/lost" className="btn btn-secondary btn-small">
              I lost something
            </Link>
          </div>
        </div>
        {reports.length === 0 ? (
          <p className="panel mt-4 p-6 text-ink-soft">
            You have not reported anything yet. Reports you publish appear here so you can follow
            them.
          </p>
        ) : (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((card) => (
              <li key={card.id}>
                <ItemTag card={card} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
