import "server-only";
import type { Tx } from "@/lib/db";
import { newReference } from "@/lib/reference";
import type { Decision } from "@/lib/workflow/rules";
import type { EventType } from "@/generated/prisma/enums";

/**
 * Thrown when a workflow rule says no. Server actions catch it and show the
 * message to the user. Any other error is treated as a bug.
 */
export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

export function assertAllowed(decision: Decision): void {
  if (!decision.ok) throw new WorkflowError(decision.reason);
}

/**
 * Locks one report row until the surrounding transaction ends.
 *
 * Every workflow change (custody, review, scheduling, handover...) takes this
 * lock first. Two requests about the same item therefore run one after the
 * other, so, for example, two administrators cannot both approve different
 * claims on the same item at the same instant.
 */
export async function lockReport(tx: Tx, reportId: string): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Report" WHERE id = ${reportId} FOR UPDATE
  `;
  if (rows.length === 0) throw new WorkflowError("That report does not exist.");
}

/** Adds one row to the append-only workflow history. */
export async function recordEvent(
  tx: Tx,
  event: {
    type: EventType;
    message: string;
    reportId: string;
    /** Set for events only the claimant and administrators may see. */
    claimId?: string;
    actorId: string;
  },
): Promise<void> {
  await tx.workflowEvent.create({ data: event });
}

/** Creates an in-app notification for each recipient. */
export async function notify(
  tx: Tx,
  userIds: string[],
  notification: { title: string; body: string; href: string },
): Promise<void> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  await tx.notification.createMany({
    data: unique.map((userId) => ({ userId, ...notification })),
  });
}

export async function adminIds(tx: Tx): Promise<string[]> {
  const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  return admins.map((admin) => admin.id);
}

/** Generates a reference that is not already in use. */
export async function uniqueReference(tx: Tx, prefix: "CT" | "CL"): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = newReference(prefix);
    const taken =
      prefix === "CT"
        ? await tx.report.findUnique({ where: { reference }, select: { id: true } })
        : await tx.claim.findUnique({ where: { reference }, select: { id: true } });
    if (!taken) return reference;
  }
  throw new Error("Could not generate a unique reference.");
}
