import "server-only";
import { db } from "@/lib/db";
import { SENSITIVE_CATEGORIES } from "@/lib/constants";
import type { ReportInput } from "@/lib/validation";
import {
  ACCEPTED_CLAIM_STATUSES,
  canCloseReport,
  canRecordCustody,
  canResolveLostReport,
  isValidOccurrenceDate,
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
 * Publishes a found or lost report.
 *
 * Files are written to storage first and the database rows second. If the
 * database write fails the files are removed again, so we never keep a file
 * that no row points to.
 */
export async function createReport(
  actor: Actor,
  input: ReportInput,
  photo: ValidatedUpload | null,
) {
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  assertAllowed(isValidOccurrenceDate(input.occurredOn, today));

  const isFound = input.kind === "FOUND";
  if (isFound && !input.dropOffPointId) {
    throw new WorkflowError("Choose where you will drop the item off.");
  }

  const stored = photo ? await storeUploads([photo]) : [];
  try {
    return await db.$transaction(async (tx) => {
      const dropOffPoint = isFound
        ? await tx.collectionPoint.findFirst({
            where: { id: input.dropOffPointId, isActive: true },
          })
        : null;
      if (isFound && !dropOffPoint) {
        throw new WorkflowError("That collection point is not available.");
      }

      const report = await tx.report.create({
        data: {
          reference: await uniqueReference(tx, "CT"),
          kind: input.kind,
          title: input.title,
          category: input.category,
          description: input.description,
          privateDetails: input.privateDetails,
          area: input.area,
          locationDetail: input.locationDetail,
          occurredOn: input.occurredOn,
          // Photos of ID and bank cards are never public, whatever was ticked.
          photoPublic: input.photoPublic && !SENSITIVE_CATEGORIES.includes(input.category),
          reporterId: actor.id,
          dropOffPointId: dropOffPoint?.id,
          photos: {
            create: stored.map((file) => ({
              ...file,
              purpose: "REPORT_PHOTO" as const,
              uploadedById: actor.id,
            })),
          },
        },
      });

      await recordEvent(tx, {
        type: "REPORT_PUBLISHED",
        message: isFound ? "Found item reported and published." : "Lost item reported and published.",
        reportId: report.id,
        actorId: actor.id,
      });

      if (isFound && dropOffPoint) {
        await notify(tx, await adminIds(tx), {
          title: "New found item to expect",
          body: `${report.title} (${report.reference}). The finder plans to drop it off at ${dropOffPoint.name}.`,
          href: `/reports/${report.id}`,
        });
      }
      return report;
    });
  } catch (error) {
    await discardUploads(stored);
    throw error;
  }
}

/** An administrator confirms the item is physically at a collection point. */
export async function recordCustody(
  actor: Actor,
  reportId: string,
  input: { collectionPointId: string; custodyTag: string },
) {
  return db.$transaction(async (tx) => {
    await lockReport(tx, reportId);
    const report = await tx.report.findUniqueOrThrow({
      where: { id: reportId },
      include: {
        claims: { where: { status: { in: [...ACCEPTED_CLAIM_STATUSES] } } },
      },
    });
    assertAllowed(canRecordCustody({ report, actor }));

    const point = await tx.collectionPoint.findFirst({
      where: { id: input.collectionPointId, isActive: true },
    });
    if (!point) throw new WorkflowError("That collection point is not available.");

    await tx.report.update({
      where: { id: reportId },
      data: {
        status: "IN_CUSTODY",
        custodyPointId: point.id,
        custodyTag: input.custodyTag,
        custodyRecordedAt: new Date(),
        custodyRecordedById: actor.id,
      },
    });

    await recordEvent(tx, {
      type: "CUSTODY_RECORDED",
      message: `Item received at ${point.name}.`,
      reportId,
      actorId: actor.id,
    });

    await notify(tx, [report.reporterId], {
      title: "Thank you for handing it in",
      body: `${point.name} has recorded the ${report.title} you found.`,
      href: `/reports/${reportId}`,
    });

    // An owner whose claim was approved early can now be told the item arrived.
    for (const claim of report.claims) {
      await notify(tx, [claim.claimantId], {
        title: "Your item has arrived",
        body: `${report.title} is now at ${point.name}. The desk will set a collection time.`,
        href: `/claims/${claim.id}`,
      });
    }
  });
}

/** Removes a report from public view. Open claims on it are closed too. */
export async function closeReport(actor: Actor, reportId: string, reason: string) {
  return db.$transaction(async (tx) => {
    await lockReport(tx, reportId);
    const report = await tx.report.findUniqueOrThrow({
      where: { id: reportId },
      include: { claims: true },
    });
    const hasAcceptedClaim = report.claims.some((claim) =>
      ACCEPTED_CLAIM_STATUSES.includes(claim.status),
    );
    assertAllowed(canCloseReport({ report, actor, hasAcceptedClaim }));

    await tx.report.update({
      where: { id: reportId },
      data: { status: "CLOSED", closedReason: reason },
    });
    await recordEvent(tx, {
      type: "REPORT_CLOSED",
      message: "Report closed.",
      reportId,
      actorId: actor.id,
    });

    const pending = report.claims.filter((claim) => claim.status === "SUBMITTED");
    for (const claim of pending) {
      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: "REJECTED",
          reviewNote: "The report for this item was closed before your claim was reviewed.",
          reviewedAt: new Date(),
          reviewedById: actor.id,
        },
      });
      await recordEvent(tx, {
        type: "CLAIM_REJECTED",
        message: "Claim closed because the report was closed.",
        reportId,
        claimId: claim.id,
        actorId: actor.id,
      });
      await notify(tx, [claim.claimantId], {
        title: "A report you claimed was closed",
        body: `The report for ${report.title} was closed, so your claim cannot go ahead.`,
        href: `/claims/${claim.id}`,
      });
    }

    if (actor.id !== report.reporterId) {
      await notify(tx, [report.reporterId], {
        title: "Your report was closed",
        body: `An administrator closed your report for ${report.title}. Reason: ${reason}`,
        href: `/reports/${reportId}`,
      });
    }
  });
}

/** The person who lost something marks it as recovered. */
export async function resolveLostReport(actor: Actor, reportId: string) {
  return db.$transaction(async (tx) => {
    await lockReport(tx, reportId);
    const report = await tx.report.findUniqueOrThrow({ where: { id: reportId } });
    assertAllowed(canResolveLostReport({ report, actor }));

    await tx.report.update({ where: { id: reportId }, data: { status: "RETURNED" } });
    await recordEvent(tx, {
      type: "REPORT_RESOLVED",
      message: "The owner has the item back.",
      reportId,
      actorId: actor.id,
    });
  });
}
