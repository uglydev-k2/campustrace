import { CalendarClock, FileText, Lock, MapPin, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclosure } from "@/components/disclosure";
import {
  ApproveClaimForm,
  ConfirmReceiptForm,
  HandoverForm,
  RejectClaimForm,
  ScheduleCollectionForm,
  WithdrawClaimForm,
} from "@/components/forms/workflow-forms";
import { JourneyTrack } from "@/components/journey-track";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { claimStatusLabel } from "@/lib/labels";
import { canViewClaim, isAdmin } from "@/lib/workflow/access";
import { buildJourney } from "@/lib/workflow/journey";
import {
  canApproveClaim,
  canConfirmReceipt,
  canRecordHandover,
  canRejectClaim,
  canScheduleCollection,
  canWithdrawClaim,
  ACCEPTED_CLAIM_STATUSES,
} from "@/lib/workflow/rules";

export const metadata: Metadata = { title: "Claim" };

/** YYYY-MM-DDTHH:mm in campus time (UTC+0), the format datetime-local uses. */
const toDateTimeInput = (date: Date) => date.toISOString().slice(0, 16);

export default async function ClaimPage({ params, searchParams }: PageProps<"/claims/[id]">) {
  const { id } = await params;
  const { notice } = await searchParams;
  const viewer = await requireUser(`/claims/${id}`);

  const claim = await db.claim.findUnique({
    where: { id },
    include: {
      report: { include: { custodyPoint: true, dropOffPoint: true } },
      claimant: { select: { name: true, email: true, studentNumber: true } },
      lostReport: { select: { id: true, title: true, reference: true } },
      evidence: { select: { id: true, originalName: true, mimeType: true }, orderBy: { createdAt: "asc" } },
    },
  });
  // The finder, other students and anyone guessing ids all get the same 404.
  if (!claim || !canViewClaim(viewer, claim)) notFound();

  const { report } = claim;
  const admin = isAdmin(viewer);
  const isClaimant = viewer.id === claim.claimantId;

  // History for this page: the report's public events plus this claim's own.
  const events = await db.workflowEvent.findMany({
    where: { reportId: report.id, OR: [{ claimId: null }, { claimId: claim.id }] },
    orderBy: { createdAt: "asc" },
  });

  const otherAccepted = admin
    ? await db.claim.count({
        where: { reportId: report.id, id: { not: claim.id }, status: { in: [...ACCEPTED_CLAIM_STATUSES] } },
      })
    : 0;

  const may = {
    approve: canApproveClaim({ claim, report, actor: viewer, anotherClaimAccepted: otherAccepted > 0 }),
    reject: canRejectClaim({ claim, actor: viewer }),
    schedule: canScheduleCollection({ claim, report, actor: viewer }),
    handover: canRecordHandover({ claim, report, actor: viewer }),
    withdraw: canWithdrawClaim({ claim, actor: viewer }),
    confirm: canConfirmReceipt({ claim, actor: viewer }),
  };

  const inCustody = report.status === "IN_CUSTODY";
  const awaitingItem = claim.status === "APPROVED" && !inCustody;
  const point = report.custodyPoint;
  const next = nextStepText(claim.status, inCustody, admin);

  return (
    <>
      <PageHeader
        back={{ href: `/reports/${report.id}`, label: report.title }}
        title={
          <>
            {isClaimant ? "Your claim on" : "Claim on"} {report.title}
          </>
        }
        meta={
          <>
            <span className="inline-flex items-center rounded-sm bg-navy-900 px-2 py-0.5 text-caption font-medium text-white">
              Claim
            </span>
            <StatusBadge {...claimStatusLabel(claim.status)} />
            <span className="type-reference text-caption text-ink-faint">{claim.reference}</span>
          </>
        }
        description={
          <>
            Found item{" "}
            <Link href={`/reports/${report.id}`} className="link">
              {report.reference}
            </Link>
            , submitted {formatDateTime(claim.createdAt)}
          </>
        }
      >
        {claim.status !== "REJECTED" && claim.status !== "WITHDRAWN" && (
          <div className="mt-8 rounded-lg border border-line bg-paper p-5 sm:p-6">
            <JourneyTrack steps={buildJourney(report.status, claim.status)} />
          </div>
        )}
      </PageHeader>

    <div className="container-page pt-8">
      <Notice code={typeof notice === "string" ? notice : undefined} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="min-w-0 space-y-8">
          {/* ---- What happens next ------------------------------------------- */}
          <section className="relative overflow-hidden rounded-lg border border-brand-100 bg-brand-50/70 p-5 pl-6">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand-600" />
            <h2 className="type-card">{next.title}</h2>
            <p className="mt-1 text-small text-ink-soft">{next.body}</p>
            {claim.reviewNote && (
              <p className="mt-3 border-t border-brand-100 pt-3 text-small">
                <span className="font-semibold">Note from the desk: </span>
                {claim.reviewNote}
              </p>
            )}
          </section>

          {/* ---- Collection details ------------------------------------------ */}
          {claim.collectionAt && point && claim.status === "COLLECTION_SCHEDULED" && (
            <section className="panel">
              <h2 className="panel-header type-card">Collection</h2>
              <dl className="grid gap-5 p-5 sm:grid-cols-2">
                <div className="flex gap-3">
                  <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-700" />
                  <div>
                    <dt className="text-caption font-medium text-ink-faint">When</dt>
                    <dd className="font-semibold">{formatDateTime(claim.collectionAt)}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-700" />
                  <div>
                    <dt className="text-caption font-medium text-ink-faint">Where</dt>
                    <dd className="font-semibold">{point.name}</dd>
                    <dd className="text-small text-ink-soft">
                      {point.location}. Open {point.openingHours}.
                    </dd>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-caption font-medium text-ink-faint">Bring</dt>
                  <dd>
                    Your student ID, and this reference:{" "}
                    <span className="type-reference">{claim.reference}</span>
                  </dd>
                  {claim.collectionNote && <dd className="mt-2">{claim.collectionNote}</dd>}
                </div>
              </dl>
            </section>
          )}

          {/* ---- The evidence ------------------------------------------------- */}
          <section>
            <h2 className="type-section flex items-center gap-2">
              <Lock aria-hidden className="size-4 text-ink-faint" />
              {isClaimant ? "What you told the desk" : "The claimant's evidence"}
            </h2>
            <p className="mt-1 text-small text-ink-soft">
              Visible to {isClaimant ? "you and desk staff" : "desk staff and the claimant"} only.
            </p>

            {admin && (
              <dl className="panel mt-4 grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0 [&>div]:px-4 [&>div]:py-3 [&_dd]:text-small [&_dd]:font-medium">
                <div>
                  <dt className="text-caption font-medium text-ink-faint">Claimant</dt>
                  <dd>{claim.claimant.name}</dd>
                </div>
                <div>
                  <dt className="text-caption font-medium text-ink-faint">Email</dt>
                  <dd className="break-all">{claim.claimant.email}</dd>
                </div>
                <div>
                  <dt className="text-caption font-medium text-ink-faint">Student number</dt>
                  <dd>{claim.claimant.studentNumber ?? "Not given"}</dd>
                </div>
              </dl>
            )}

            <div className={`mt-4 grid gap-4 ${admin ? "md:grid-cols-2" : ""}`}>
              <div className="panel p-5 shadow-xs">
                <h3 className="text-caption font-medium text-ink-faint">
                  {isClaimant ? "Your description" : "Claimant's description"}
                </h3>
                <p className="mt-2 whitespace-pre-line">{claim.statement}</p>
              </div>
              {/* The desk verifies by comparing the two accounts side by side. */}
              {admin && (
                <div className="rounded-lg border border-dashed border-line-strong bg-sunken/60 p-5">
                  <h3 className="text-caption font-medium text-ink-faint">Finder&apos;s private notes</h3>
                  <p className="mt-2 whitespace-pre-line">
                    {report.privateDetails ?? "The finder did not record any private details."}
                  </p>
                </div>
              )}
            </div>

            {claim.lostReport && (
              <p className="mt-4">
                Linked lost report:{" "}
                <Link href={`/reports/${claim.lostReport.id}`} className="link">
                  {claim.lostReport.title}
                </Link>{" "}
                <span className="type-reference text-small text-ink-soft">{claim.lostReport.reference}</span>
              </p>
            )}

            {claim.evidence.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-3">
                {claim.evidence.map((file) =>
                  file.mimeType.startsWith("image/") ? (
                    <li key={file.id}>
                      <a href={`/api/files/${file.id}`} target="_blank" rel="noreferrer" className="block">
                        {/* Private route with a permission check: see /api/files/[id]. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/files/${file.id}`}
                          alt={`Evidence: ${file.originalName}`}
                          className="size-28 rounded-lg border border-line object-cover shadow-xs transition-[box-shadow,border-color] duration-200 hover:border-line-strong hover:shadow-lift"
                        />
                      </a>
                    </li>
                  ) : (
                    <li key={file.id}>
                      <a
                        href={`/api/files/${file.id}`}
                        className="flex size-28 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface p-2 text-center text-caption font-medium text-ink-soft shadow-xs transition-[box-shadow,border-color,color] duration-200 hover:border-line-strong hover:text-ink hover:shadow-lift"
                      >
                        <FileText aria-hidden className="size-7" />
                        <span className="line-clamp-2 break-all">{file.originalName}</span>
                      </a>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-header type-card">History</h2>
            <div className="p-5">
              <Timeline events={events} />
            </div>
          </section>
        </div>

        {/* ---- Actions ---------------------------------------------------------- */}
        {/* On small screens the actions come first: they are why the reader is here. */}
        <aside className="order-first space-y-4 empty:hidden lg:sticky lg:top-20 lg:order-none lg:self-start">
          {may.confirm.ok && (
            <div className="panel border-returned-700/40 p-5 ring-3 ring-returned-50">
              <h2 className="type-card">Do you have your item?</h2>
              <p className="mt-1.5 mb-4 text-small text-ink-soft">
                The desk recorded handing it to you
                {claim.handedOverAt && ` on ${formatDateTime(claim.handedOverAt)}`}. Confirming
                closes the return.
              </p>
              <ConfirmReceiptForm claimId={id} />
            </div>
          )}

          {admin && may.approve.ok && (
            <div className="panel p-5">
              <DeskLabel />
              <h2 className="type-card">Review this claim</h2>
              <p className="mt-1.5 mb-4 text-small text-ink-soft">
                Approve only if the claimant&apos;s description matches the finder&apos;s private
                notes or the item itself.
                {!inCustody && " You can decide now, before the item arrives."}
              </p>
              <ApproveClaimForm claimId={id} />
              <div className="mt-5 border-t border-line pt-3">
                <Disclosure summary="Do not approve this claim">
                  <RejectClaimForm claimId={id} revoking={false} />
                </Disclosure>
              </div>
            </div>
          )}

          {admin && claim.status === "SUBMITTED" && !may.approve.ok && (
            <div className="panel p-5">
              <DeskLabel />
              <h2 className="type-card">Review this claim</h2>
              <p className="mt-1.5 mb-4 text-small text-ink-soft">{may.approve.reason}</p>
              <RejectClaimForm claimId={id} revoking={false} />
            </div>
          )}

          {/* The custody gate, made visible. */}
          {admin && awaitingItem && (
            <div className="rounded-lg border border-lost-100 bg-lost-50 p-5" data-testid="custody-gate">
              <h2 className="type-card flex items-start gap-2">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-lost-700" />
                Collection is blocked
              </h2>
              <p className="mt-1.5 text-small text-ink-soft">
                The claim is approved, but custody has not been confirmed. Once the finder hands
                the item in, record custody on the report and scheduling opens here.
              </p>
              <Link href={`/reports/${report.id}`} className="btn btn-secondary mt-4 w-full">
                Open the report to record custody
              </Link>
            </div>
          )}

          {admin && may.schedule.ok && (
            <div className="panel p-5">
              <DeskLabel />
              <h2 className="type-card">
                {claim.collectionAt ? "Change the collection time" : "Schedule collection"}
              </h2>
              <p className="mt-1.5 mb-4 text-small text-ink-soft">
                The item is at {point?.name}, shelf{" "}
                <span className="type-reference text-ink">{report.custodyTag}</span>.
              </p>
              <ScheduleCollectionForm
                claimId={id}
                minDateTime={toDateTimeInput(new Date())}
                current={claim.collectionAt ? toDateTimeInput(claim.collectionAt) : null}
                currentNote={claim.collectionNote}
              />
            </div>
          )}

          {admin && may.handover.ok && (
            <div className="panel p-5">
              <DeskLabel />
              <h2 className="type-card">Record the handover</h2>
              <p className="mt-1.5 mb-4 text-small text-ink-soft">
                Do this at the desk, when the owner is in front of you with their student ID.
              </p>
              <HandoverForm claimId={id} />
            </div>
          )}

          {admin && may.reject.ok && claim.status !== "SUBMITTED" && (
            <div className="px-1">
              <Disclosure summary="Withdraw this approval">
                <RejectClaimForm claimId={id} revoking />
              </Disclosure>
            </div>
          )}

          {may.withdraw.ok && (
            <div className="px-1">
              <Disclosure summary="Withdraw this claim">
                <WithdrawClaimForm claimId={id} />
              </Disclosure>
            </div>
          )}

          {claim.status === "COMPLETED" && (
            <div className="rounded-lg border border-returned-100 bg-returned-50 p-5">
              <h2 className="type-card">Return complete</h2>
              <p className="mt-1.5 text-small text-ink-soft">
                Receipt confirmed
                {claim.receiptConfirmedAt && ` on ${formatDateTime(claim.receiptConfirmedAt)}`}.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
    </>
  );
}

/** Marks a panel as a desk-only tool, so staff can tell it from the student view. */
function DeskLabel() {
  return (
    <p className="mb-2 inline-flex items-center rounded-sm bg-navy-900 px-1.5 py-0.5 text-[0.6875rem] font-medium text-white">
      Desk only
    </p>
  );
}

/** Plain-language guidance for each state, worded for whoever is reading. */
function nextStepText(
  status: string,
  inCustody: boolean,
  admin: boolean,
): { title: string; body: string } {
  switch (status) {
    case "SUBMITTED":
      return admin
        ? { title: "Waiting for a decision", body: "Compare the claimant's description with the finder's private notes, then approve or decline." }
        : { title: "The desk is reviewing your claim", body: "You will get a notification when there is a decision. There is nothing you need to do for now." };
    case "APPROVED":
      if (inCustody) {
        return admin
          ? { title: "Ready to schedule", body: "The item is in custody. Set a collection time with the owner." }
          : { title: "Approved. A collection time is coming", body: "The desk has your item and will set a time for you to collect it." };
      }
      return admin
        ? { title: "Approved, waiting for the item", body: "The finder has not handed the item in yet, so collection cannot be scheduled." }
        : { title: "Approved. Waiting for the item to arrive", body: "The finder has not dropped the item off yet. As soon as the desk has it, you will get a collection time. Please do not travel to the desk before then." };
    case "COLLECTION_SCHEDULED":
      return admin
        ? { title: "Collection arranged", body: "Record the handover when the owner collects the item." }
        : { title: "Collect your item", body: "Go to the collection point at the time below with your student ID." };
    case "HANDED_OVER":
      return admin
        ? { title: "Handed over", body: "Waiting for the owner to confirm receipt." }
        : { title: "One last step", body: "The desk recorded handing the item to you. Confirm that you have it." };
    case "COMPLETED":
      return { title: "This return is complete", body: "The item is back with its owner and receipt has been confirmed." };
    case "REJECTED":
      return admin
        ? { title: "This claim was not approved", body: "The claimant has been told." }
        : { title: "Your claim was not approved", body: "The desk could not match your description to the item. If you have more evidence, take it to a collection point in person." };
    default:
      return { title: "This claim was withdrawn", body: "No further action will be taken on it." };
  }
}
