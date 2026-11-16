import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        back={{ href: `/reports/${id}`, label: report.title }}
        title="This item cannot be claimed"
        description={decision.reason}
        actions={
          <>
            {existing && (
              <Link href={`/claims/${existing.id}`} className="btn btn-primary">
                Open your claim
              </Link>
            )}
            <Link href={`/reports/${id}`} className="btn btn-secondary">
              Back to the report
            </Link>
          </>
        }
      />
    );
  }

  const lostReports = await db.report.findMany({
    where: { reporterId: user.id, kind: "LOST", status: "OPEN" },
    select: { id: true, title: true, occurredOn: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        back={{ href: `/reports/${id}`, label: report.title }}
        title="Claim this item"
        meta={<span className="type-reference text-caption text-ink-faint">{report.reference}</span>}
        description={
          <span className="flex items-start gap-2">
            <Lock aria-hidden className="mt-1 size-4 shrink-0 text-brand-700" />
            Only desk staff read your claim. The finder never sees who you are or what you wrote.
          </span>
        }
      />
      <div className="container-page pt-8">
        <div className="panel max-w-2xl p-5 shadow-xs sm:p-7">
          <ClaimForm
            reportId={id}
            lostReports={lostReports.map((lost) => ({
              id: lost.id,
              label: `${lost.title} (lost ${formatDate(lost.occurredOn)})`,
            }))}
          />
        </div>
      </div>
    </>
  );
}
