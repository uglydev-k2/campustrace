import "server-only";
import { db, type Tx } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { ClaimInput } from "@/lib/validation";
import {
  ACCEPTED_CLAIM_STATUSES,
  canApproveClaim,
  canConfirmReceipt,
  canLinkLostReport,
  canRecordHandover,
  canRejectClaim,
  canScheduleCollection,
  canSubmitClaim,
  canWithdrawClaim,
  isValidCollectionTime,
  type Actor,
} from "@/lib/workflow/rules";
import { discardUploads, storeUploads, type ValidatedUpload } from "@/server/uploads";
import {
  adminIds,
  assertAllowed,
  lockReport,
  notify,
  recordEvent,
  uniqueReference,
  WorkflowError,
} from "./shared";

/**
 * Loads a claim and its report with the report row locked.
 * Every claim transition starts here, so transitions on one item never overlap.
 */
async function loadClaimLocked(tx: Tx, claimId: string) {
  const pointer = await tx.claim.findUnique({
    where: { id: claimId },
    select: { reportId: true },
  });
  if (!pointer) throw new WorkflowError("That claim does not exist.");
  await lockReport(tx, pointer.reportId);
  return tx.claim.findUniqueOrThrow({
    where: { id: claimId },
    include: { report: { include: { custodyPoint: true, dropOffPoint: true } } },
  });
}

/** The owner submits private evidence that a found item is theirs. */
export async function submitClaim(
  actor: Actor,
  reportId: string,
  input: ClaimInput,
  evidence: ValidatedUpload[],
) {
  const stored = await storeUploads(evidence);
  try {
    return await db.$transaction(async (tx) => {
      await lockReport(tx, reportId);
      const report = await tx.report.findUniqueOrThrow({
        where: { id: reportId },
        include: { dropOffPoint: true },
      });
      const existing = await tx.claim.findUnique({
        where: { reportId_claimantId: { reportId, claimantId: actor.id } },
        select: { id: true },
      });
      assertAllowed(canSubmitClaim({ report, actor, alreadyClaimedByActor: existing !== null }));

      if (input.lostReportId) {
        const lostReport = await tx.report.findUnique({ where: { id: input.lostReportId } });
        if (!lostReport) throw new WorkflowError("That lost report does not exist.");
        assertAllowed(canLinkLostReport({ lostReport, actor }));
      }

      const claim = await tx.claim.create({
        data: {
          reference: await uniqueReference(tx, "CL"),
          reportId,
          claimantId: actor.id,
          lostReportId: input.lostReportId,
          statement: input.statement,
          evidence: {
            create: stored.map((file) => ({
              ...file,
              purpose: "CLAIM_EVIDENCE" as const,
              uploadedById: actor.id,
            })),
          },
        },
      });

      await recordEvent(tx, {
        type: "CLAIM_SUBMITTED",
        message: "Ownership claim submitted.",
        reportId,
        claimId: claim.id,
        actorId: actor.id,
      });

      await notify(tx, await adminIds(tx), {
        title: "New claim to review",
        body: `${claim.reference} on ${report.title} (${report.reference}).`,
        href: `/claims/${claim.id}`,
      });

      // The finder learns that someone has claimed the item, but never who.
      if (report.status === "OPEN") {
        await notify(tx, [report.reporterId], {
          title: "Someone has claimed the item you found",
          body: `Please drop the ${report.title} off at ${report.dropOffPoint?.name ?? "a collection point"} so it can be returned.`,
          href: `/reports/${reportId}`,
        });
      }
      return claim;
    });
  } catch (error) {
    await discardUploads(stored);
    throw error;
  }
}

export async function approveClaim(actor: Actor, claimId: string, note: string | undefined) {
  return db.$transaction(async (tx) => {
    const claim = await loadClaimLocked(tx, claimId);
    const otherAccepted = await tx.claim.count({
      where: {
        reportId: claim.reportId,
        id: { not: claim.id },
        status: { in: [...ACCEPTED_CLAIM_STATUSES] },
      },
    });
    assertAllowed(
      canApproveClaim({
        claim,
        report: claim.report,
        actor,
        anotherClaimAccepted: otherAccepted > 0,
      }),
    );

    await tx.claim.update({
      where: { id: claimId },
      data: {
        status: "APPROVED",
        reviewNote: note ?? null,
        reviewedAt: new Date(),
        reviewedById: actor.id,
      },
    });
    await recordEvent(tx, {
      type: "CLAIM_APPROVED",
      message: "Claim approved.",
      reportId: claim.reportId,
      claimId,
      actorId: actor.id,
    });

    const inCustody = claim.report.status === "IN_CUSTODY";
    await notify(tx, [claim.claimantId], {
      title: "Your claim was approved",
      body: inCustody
        ? `The desk will set a time for you to collect your ${claim.report.title}.`
        : `We are waiting for the finder to deliver your ${claim.report.title} to a collection point. You will hear from us when it arrives.`,
      href: `/claims/${claimId}`,
    });
  });
}

/** Rejects a claim, or revokes an approval that has not been handed over yet. */
export async function rejectClaim(actor: Actor, claimId: string, note: string) {
  return db.$transaction(async (tx) => {
    const claim = await loadClaimLocked(tx, claimId);
    assertAllowed(canRejectClaim({ claim, actor }));

    await tx.claim.update({
      where: { id: claimId },
      data: {
        status: "REJECTED",
        reviewNote: note,
        reviewedAt: new Date(),
        reviewedById: actor.id,
        collectionAt: null,
        collectionNote: null,
      },
    });
    await recordEvent(tx, {
      type: "CLAIM_REJECTED",
      message: claim.status === "SUBMITTED" ? "Claim not approved." : "Approval withdrawn.",
      reportId: claim.reportId,
      claimId,
      actorId: actor.id,
    });
    await notify(tx, [claim.claimantId], {
      title: "Your claim was not approved",
      body: `The desk left a note about your claim on ${claim.report.title}.`,
      href: `/claims/${claimId}`,
    });
  });
}

export async function withdrawClaim(actor: Actor, claimId: string) {
  return db.$transaction(async (tx) => {
    const claim = await loadClaimLocked(tx, claimId);
    assertAllowed(canWithdrawClaim({ claim, actor }));

    await tx.claim.update({
      where: { id: claimId },
      data: { status: "WITHDRAWN", collectionAt: null, collectionNote: null },
    });
    await recordEvent(tx, {
      type: "CLAIM_WITHDRAWN",
      message: "Claim withdrawn by the claimant.",
      reportId: claim.reportId,
      claimId,
      actorId: actor.id,
    });
    await notify(tx, await adminIds(tx), {
      title: "A claim was withdrawn",
      body: `${claim.reference} on ${claim.report.title} was withdrawn by the claimant.`,
      href: `/claims/${claimId}`,
    });
  });
}

/**
 * Sets (or changes) the collection time. The custody gate lives in
 * canScheduleCollection: without recorded custody this always fails.
 */
export async function scheduleCollection(
  actor: Actor,
  claimId: string,
  input: { collectionAt: Date; note?: string },
) {
  return db.$transaction(async (tx) => {
    const claim = await loadClaimLocked(tx, claimId);
    assertAllowed(canScheduleCollection({ claim, report: claim.report, actor }));
    assertAllowed(isValidCollectionTime(input.collectionAt, new Date()));

    const point = claim.report.custodyPoint;
    if (!point) throw new WorkflowError("This item has no collection point on record.");

    await tx.claim.update({
      where: { id: claimId },
      data: {
        status: "COLLECTION_SCHEDULED",
        collectionAt: input.collectionAt,
        collectionNote: input.note ?? null,
      },
    });
    const when = formatDateTime(input.collectionAt);
    await recordEvent(tx, {
      type: "COLLECTION_SCHEDULED",
      message: `Collection arranged for ${when} at ${point.name}.`,
      reportId: claim.reportId,
      claimId,
      actorId: actor.id,
    });
    await notify(tx, [claim.claimantId], {
      title: "Your collection time is set",
      body: `Collect your ${claim.report.title} on ${when} at ${point.name}. Bring your student ID.`,
      href: `/claims/${claimId}`,
    });
  });
}

/** The desk hands the item to its owner. This is the point of no return. */
export async function recordHandover(
  actor: Actor,
  claimId: string,
  input: { note?: string },
) {
  return db.$transaction(async (tx) => {
    const claim = await loadClaimLocked(tx, claimId);
    assertAllowed(canRecordHandover({ claim, report: claim.report, actor }));

    const now = new Date();
    await tx.claim.update({
      where: { id: claimId },
      data: {
        status: "HANDED_OVER",
        handedOverAt: now,
        handedOverById: actor.id,
        handoverNote: input.note ?? null,
      },
    });
    await tx.report.update({ where: { id: claim.reportId }, data: { status: "RETURNED" } });

    // Public history says only that the item went back to its owner.
    await recordEvent(tx, {
      type: "HANDOVER_RECORDED",
      message: "Item returned to its owner.",
      reportId: claim.reportId,
      actorId: actor.id,
    });
    await recordEvent(tx, {
      type: "HANDOVER_RECORDED",
      message: "Handover recorded. The collector's student ID was checked.",
      reportId: claim.reportId,
      claimId,
      actorId: actor.id,
    });

    // If the owner linked their lost report, it is resolved too.
    if (claim.lostReportId) {
      const lostReport = await tx.report.findUnique({ where: { id: claim.lostReportId } });
      if (lostReport?.status === "OPEN") {
        await tx.report.update({ where: { id: lostReport.id }, data: { status: "RETURNED" } });
        await recordEvent(tx, {
          type: "REPORT_RESOLVED",
          message: "The owner has the item back.",
          reportId: lostReport.id,
          actorId: actor.id,
        });
      }
    }

    // Any other claim still waiting on this item can no longer succeed.
    const others = await tx.claim.findMany({
      where: { reportId: claim.reportId, id: { not: claimId }, status: "SUBMITTED" },
    });
    for (const other of others) {
      await tx.claim.update({
        where: { id: other.id },
        data: {
          status: "REJECTED",
          reviewNote: "This item was returned to another claimant whose evidence was verified.",
          reviewedAt: now,
          reviewedById: actor.id,
        },
      });
      await recordEvent(tx, {
        type: "CLAIM_REJECTED",
        message: "Claim closed because the item was returned to its verified owner.",
        reportId: claim.reportId,
        claimId: other.id,
        actorId: actor.id,
      });
      await notify(tx, [other.claimantId], {
        title: "Your claim was closed",
        body: `${claim.report.title} was returned to another claimant whose evidence was verified.`,
        href: `/claims/${other.id}`,
      });
    }

    await notify(tx, [claim.claimantId], {
      title: "Please confirm you have your item",
      body: `The desk recorded handing over your ${claim.report.title}. Confirm receipt to finish.`,
      href: `/claims/${claimId}`,
    });
    await notify(tx, [claim.report.reporterId], {
      title: "It is back with its owner",
      body: `The ${claim.report.title} you found has been returned. Thank you.`,
      href: `/reports/${claim.reportId}`,
    });
  });
}

export async function confirmReceipt(actor: Actor, claimId: string) {
  return db.$transaction(async (tx) => {
    const claim = await loadClaimLocked(tx, claimId);
    assertAllowed(canConfirmReceipt({ claim, actor }));

    await tx.claim.update({
      where: { id: claimId },
      data: { status: "COMPLETED", receiptConfirmedAt: new Date() },
    });
    await recordEvent(tx, {
      type: "RECEIPT_CONFIRMED",
      message: "The owner confirmed receipt.",
      reportId: claim.reportId,
      claimId,
      actorId: actor.id,
    });
    await notify(tx, await adminIds(tx), {
      title: "Receipt confirmed",
      body: `The owner confirmed receiving ${claim.report.title} (${claim.reference}).`,
      href: `/claims/${claimId}`,
    });
  });
}
