import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimForm } from "@/components/forms/claim-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { canViewReport } from "@/lib/workflow/access";
import { canSubmitClaim } from "@/lib/workflow/rules";

export const metadata: Metadata = { title: "Claim an item" };

export default async function ClaimPage({ params }: PageProps<"/reports/[id]/claim">) {
  const { id } = await params;
  const user = await requireUser(`/reports/${id}/claim`);

  const report = await db.report.findUnique({
    where: { id },
    select: { id: true, kind: true, status: true, reporterId: true, title: true, reference: true },
  });
  if (!report || !canViewReport(user, report)) notFound();

  const existing = await db.claim.findUnique({
    where: { reportId_claimantId: { reportId: id, claimantId: user.id } },
    select: { id: true },
  });
  const decision = canSubmitClaim({
    report,
    actor: user,
    alreadyClaimedByActor: existing !== null,
  });

  // The same rule runs again inside submitClaim; this check is only so we
  // can explain the problem instead of showing a form that cannot succeed.
  if (!decision.ok) {
    return (
      <div className="container-page py-10">
        <div className="max-w-2xl">
          <h1 className="type-page">This item cannot be claimed</h1>
          <p className="mt-3 text-lead text-ink-soft">{decision.reason}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {existing && (
              <Link href={`/claims/${existing.id}`} className="btn btn-primary">
                Open your claim
              </Link>
            )}
            <Link href={`/reports/${id}`} className="btn btn-secondary">
              Back to the report
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lostReports = await db.report.findMany({
    where: { reporterId: user.id, kind: "LOST", status: "OPEN" },
    select: { id: true, title: true, occurredOn: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container-page py-10">
      <div className="max-w-2xl">
        <p className="text-small text-ink-soft">
          <Link href={`/reports/${id}`} className="link">
            {report.title}
          </Link>{" "}
          <span className="type-reference ml-1">{report.reference}</span>
        </p>
        <h1 className="type-page mt-2">Claim this item</h1>
        <p className="mt-3 flex items-start gap-2.5 text-ink-soft">
          <Lock aria-hidden className="mt-1 size-4.5 shrink-0 text-brand-700" />
          Only desk staff read your claim. The finder never sees who you are or what you wrote.
        </p>
        <div className="panel mt-8 p-5 sm:p-6">
          <ClaimForm
            reportId={id}
            lostReports={lostReports.map((lost) => ({
              id: lost.id,
              label: `${lost.title} (lost ${formatDate(lost.occurredOn)})`,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
