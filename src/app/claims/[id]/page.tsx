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
    <div className="container-page py-10">
      <Notice code={typeof notice === "string" ? notice : undefined} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-sm bg-navy-900 px-2 py-0.5 text-small font-bold text-white">Claim</span>
        <span className="type-reference text-small text-ink-soft">{claim.reference}</span>
        <StatusBadge {...claimStatusLabel(claim.status)} />
      </div>
      <h1 className="type-page mt-3">
        {isClaimant ? "Your claim on" : "Claim on"} {report.title}
      </h1>
      <p className="mt-2 text-ink-soft">
        Found item{" "}
        <Link href={`/reports/${report.id}`} className="link">
          {report.reference}
        </Link>
        , submitted {formatDateTime(claim.createdAt)}
      </p>

      {claim.status !== "REJECTED" && claim.status !== "WITHDRAWN" && (
        <div className="panel mt-8 p-5 sm:p-6">
          <JourneyTrack steps={buildJourney(report.status, claim.status)} />
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          {/* ---- What happens next ------------------------------------------- */}
          <section className="rounded-lg border-l-4 border-brand-600 bg-brand-50 p-5">
            <h2 className="type-card">{next.title}</h2>
            <p className="mt-1.5 text-ink-soft">{next.body}</p>
            {claim.reviewNote && (
              <p className="mt-3 border-t border-brand-100 pt-3">
                <span className="font-bold">Note from the desk: </span>
                {claim.reviewNote}
              </p>
            )}
          </section>

          {/* ---- Collection details ------------------------------------------ */}
          {claim.collectionAt && point && claim.status === "COLLECTION_SCHEDULED" && (
            <section>
              <h2 className="type-section">Collection</h2>
              <dl className="panel mt-4 grid gap-5 p-5 sm:grid-cols-2">
                <div className="flex gap-3">
                  <CalendarClock aria-hidden className="mt-1 size-5 shrink-0 text-brand-700" />
                  <div>
                    <dt className="text-small font-bold text-ink-soft">When</dt>
                    <dd className="font-bold">{formatDateTime(claim.collectionAt)}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-brand-700" />
                  <div>
                    <dt className="text-small font-bold text-ink-soft">Where</dt>
                    <dd className="font-bold">{point.name}</dd>
                    <dd className="text-small text-ink-soft">
                      {point.location}. Open {point.openingHours}.
                    </dd>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-small font-bold text-ink-soft">Bring</dt>
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
              <Lock aria-hidden className="size-5 text-ink-soft" />
              {isClaimant ? "What you told the desk" : "The claimant's evidence"}
            </h2>
            <p className="mt-1 text-small text-ink-soft">
              Visible to {isClaimant ? "you and desk staff" : "desk staff and the claimant"} only.
            </p>

            {admin && (
              <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-3">
                <div>
                  <dt className="text-small font-bold text-ink-soft">Claimant</dt>
                  <dd>{claim.claimant.name}</dd>
                </div>
                <div>
                  <dt className="text-small font-bold text-ink-soft">Email</dt>
                  <dd className="break-all">{claim.claimant.email}</dd>
                </div>
                <div>
                  <dt className="text-small font-bold text-ink-soft">Student number</dt>
                  <dd>{claim.claimant.studentNumber ?? "Not given"}</dd>
                </div>
              </dl>
            )}

            <div className={`mt-4 grid gap-4 ${admin ? "md:grid-cols-2" : ""}`}>
              <div className="panel p-5">
                <h3 className="text-small font-bold text-ink-soft">
                  {isClaimant ? "Your description" : "Claimant's description"}
                </h3>
                <p className="mt-2 whitespace-pre-line">{claim.statement}</p>
              </div>
              {/* The desk verifies by comparing the two accounts side by side. */}
              {admin && (
                <div className="rounded-lg border border-line-strong bg-sunken p-5">
                  <h3 className="text-small font-bold text-ink-soft">Finder&apos;s private notes</h3>
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
                          className="size-28 rounded-md border border-line object-cover"
                        />
                      </a>
                    </li>
                  ) : (
                    <li key={file.id}>
                      <a
                        href={`/api/files/${file.id}`}
                        className="flex size-28 flex-col items-center justify-center gap-2 rounded-md border border-line bg-surface p-2 text-center text-caption font-bold text-brand-700 hover:border-navy-700"
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

          <section>
            <h2 className="type-section">History</h2>
            <div className="mt-4">
              <Timeline events={events} />
            </div>
          </section>
        </div>

        {/* ---- Actions ---------------------------------------------------------- */}
        {/* On small screens the actions come first: they are why the reader is here. */}
        <aside className="order-first space-y-5 empty:hidden lg:order-none">
          {may.confirm.ok && (
            <div className="panel border-returned-700 p-5">
              <h2 className="type-card">Do you have your item?</h2>
              <p className="mt-2 mb-4 text-ink-soft">
                The desk recorded handing it to you
                {claim.handedOverAt && ` on ${formatDateTime(claim.handedOverAt)}`}. Confirming
                closes the return.
              </p>
              <ConfirmReceiptForm claimId={id} />
            </div>
          )}

          {admin && may.approve.ok && (
            <div className="panel border-navy-700 p-5">
              <h2 className="type-card">Desk: review this claim</h2>
              <p className="mt-2 mb-4 text-ink-soft">
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
            <div className="panel border-navy-700 p-5">
              <h2 className="type-card">Desk: review this claim</h2>
              <p className="mt-2 mb-4 text-ink-soft">{may.approve.reason}</p>
              <RejectClaimForm claimId={id} revoking={false} />
            </div>
          )}

          {/* The custody gate, made visible. */}
          {admin && awaitingItem && (
            <div className="rounded-lg border border-lost-700 bg-lost-50 p-5" data-testid="custody-gate">
              <h2 className="type-card flex items-start gap-2">
                <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-lost-700" />
                Collection is blocked
              </h2>
              <p className="mt-2 text-ink-soft">
                The claim is approved, but custody has not been confirmed. Once the finder hands
                the item in, record custody on the report and scheduling opens here.
              </p>
              <Link href={`/reports/${report.id}`} className="btn btn-secondary mt-4 w-full">
                Open the report to record custody
              </Link>
            </div>
          )}

          {admin && may.schedule.ok && (
            <div className="panel border-navy-700 p-5">
              <h2 className="type-card">
                Desk: {claim.collectionAt ? "change the collection time" : "schedule collection"}
              </h2>
              <p className="mt-2 mb-4 text-ink-soft">
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
            <div className="panel border-navy-700 p-5">
              <h2 className="type-card">Desk: record the handover</h2>
              <p className="mt-2 mb-4 text-ink-soft">
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
            <div className="rounded-lg border border-returned-700 bg-returned-50 p-5">
              <h2 className="type-card">Return complete</h2>
              <p className="mt-2 text-ink-soft">
                Receipt confirmed
                {claim.receiptConfirmedAt && ` on ${formatDateTime(claim.receiptConfirmedAt)}`}.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
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
