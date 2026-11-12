/**
 * The business rules of the return workflow.
 *
 * Every function here is pure: it takes plain values and returns a decision.
 * Nothing in this file touches the database, the session or the clock unless
 * it is passed in. That makes the rules easy to read, easy to unit test
 * (see tests/unit/rules.test.ts) and impossible to bypass by accident, because
 * the services in src/server/services call them inside the same database
 * transaction that performs the change.
 */

export type Role = "STUDENT" | "ADMIN";
export type ReportKind = "FOUND" | "LOST";
export type ReportStatus = "OPEN" | "IN_CUSTODY" | "RETURNED" | "CLOSED";
export type ClaimStatus =
  | "SUBMITTED"
  | "APPROVED"
  | "COLLECTION_SCHEDULED"
  | "HANDED_OVER"
  | "COMPLETED"
  | "REJECTED"
  | "WITHDRAWN";

export type Actor = { id: string; role: Role };
export type ReportState = { kind: ReportKind; status: ReportStatus; reporterId: string };
export type ClaimState = { status: ClaimStatus; claimantId: string };

export type Decision = { ok: true } | { ok: false; reason: string };

const allow: Decision = { ok: true };
const deny = (reason: string): Decision => ({ ok: false, reason });

/** Claims that are still moving through the workflow. */
export const OPEN_CLAIM_STATUSES: readonly ClaimStatus[] = [
  "SUBMITTED",
  "APPROVED",
  "COLLECTION_SCHEDULED",
];

/**
 * Claims an administrator has accepted. A found item can have at most one
 * claim in any of these states.
 */
export const ACCEPTED_CLAIM_STATUSES: readonly ClaimStatus[] = [
  "APPROVED",
  "COLLECTION_SCHEDULED",
  "HANDED_OVER",
  "COMPLETED",
];

// --- Claims: the owner's side ------------------------------------------------

export function canSubmitClaim(input: {
  report: ReportState;
  actor: Actor;
  alreadyClaimedByActor: boolean;
}): Decision {
  const { report, actor } = input;
  if (report.kind !== "FOUND") return deny("Only found items can be claimed.");
  // Desk staff decide claims, so they must not also make them.
  if (actor.role === "ADMIN") {
    return deny("Desk accounts cannot claim items. Use a student account.");
  }
  if (report.reporterId === actor.id) {
    return deny("You reported this item, so you cannot claim it.");
  }
  if (report.status !== "OPEN" && report.status !== "IN_CUSTODY") {
    return deny("This item is no longer available to claim.");
  }
  if (input.alreadyClaimedByActor) return deny("You have already claimed this item.");
  return allow;
}

/** A claim may cite one of the claimant's own open lost reports. */
export function canLinkLostReport(input: { lostReport: ReportState; actor: Actor }): Decision {
  const { lostReport, actor } = input;
  if (lostReport.kind !== "LOST") return deny("Only a lost report can be linked to a claim.");
  if (lostReport.reporterId !== actor.id) return deny("You can only link your own lost report.");
  if (lostReport.status !== "OPEN") return deny("That lost report is no longer open.");
  return allow;
}

export function canWithdrawClaim(input: { claim: ClaimState; actor: Actor }): Decision {
  const { claim, actor } = input;
  if (claim.claimantId !== actor.id) return deny("Only the claimant can withdraw a claim.");
  if (!OPEN_CLAIM_STATUSES.includes(claim.status)) {
    return deny("This claim can no longer be withdrawn.");
  }
  return allow;
}

export function canConfirmReceipt(input: { claim: ClaimState; actor: Actor }): Decision {
  const { claim, actor } = input;
  if (claim.claimantId !== actor.id) return deny("Only the claimant can confirm receipt.");
  if (claim.status !== "HANDED_OVER") {
    return deny("Receipt can be confirmed once the handover has been recorded.");
  }
  return allow;
}

// --- Claims: the administrator's side ----------------------------------------

export function canApproveClaim(input: {
  claim: ClaimState;
  report: ReportState;
  actor: Actor;
  anotherClaimAccepted: boolean;
}): Decision {
  const { claim, report, actor } = input;
  if (actor.role !== "ADMIN") return deny("Only an administrator can review claims.");
  if (claim.status !== "SUBMITTED") return deny("This claim has already been reviewed.");
  if (report.status !== "OPEN" && report.status !== "IN_CUSTODY") {
    return deny("This item is no longer available.");
  }
  if (input.anotherClaimAccepted) {
    return deny("Another claim on this item has already been approved.");
  }
  return allow;
}

/**
 * Rejecting also covers revoking an approval, for example when new evidence
 * arrives before the item has been handed over.
 */
export function canRejectClaim(input: { claim: ClaimState; actor: Actor }): Decision {
  const { claim, actor } = input;
  if (actor.role !== "ADMIN") return deny("Only an administrator can review claims.");
  if (!OPEN_CLAIM_STATUSES.includes(claim.status)) {
    return deny("This claim can no longer be rejected.");
  }
  return allow;
}

/**
 * The custody gate: a collection can only be arranged once an administrator
 * has confirmed the item is physically at a collection point.
 */
export function canScheduleCollection(input: {
  claim: ClaimState;
  report: ReportState;
  actor: Actor;
}): Decision {
  const { claim, report, actor } = input;
  if (actor.role !== "ADMIN") return deny("Only an administrator can schedule a collection.");
  if (claim.status !== "APPROVED" && claim.status !== "COLLECTION_SCHEDULED") {
    return deny("A collection can only be scheduled for an approved claim.");
  }
  if (report.status !== "IN_CUSTODY") {
    return deny(
      "Custody has not been confirmed. Record the item at a collection point before scheduling its collection.",
    );
  }
  return allow;
}

export function canRecordHandover(input: {
  claim: ClaimState;
  report: ReportState;
  actor: Actor;
}): Decision {
  const { claim, report, actor } = input;
  if (actor.role !== "ADMIN") return deny("Only an administrator can record a handover.");
  if (report.status !== "IN_CUSTODY") {
    return deny("Custody has not been confirmed, so this item cannot be handed over.");
  }
  if (claim.status !== "COLLECTION_SCHEDULED") {
    return deny("Schedule the collection before recording the handover.");
  }
  return allow;
}

// --- Reports -------------------------------------------------------------------

export function canRecordCustody(input: { report: ReportState; actor: Actor }): Decision {
  const { report, actor } = input;
  if (actor.role !== "ADMIN") return deny("Only an administrator can record custody.");
  if (report.kind !== "FOUND") return deny("Custody applies to found items only.");
  if (report.status !== "OPEN") return deny("Custody has already been recorded for this item.");
  return allow;
}

/**
 * Closing removes a report from public view.
 * - The reporter can close their own report while they still hold the item.
 * - An administrator can also close an unclaimed item that is in custody.
 * - Nobody can close a found item while an accepted claim is in progress.
 */
export function canCloseReport(input: {
  report: ReportState;
  actor: Actor;
  hasAcceptedClaim: boolean;
}): Decision {
  const { report, actor } = input;
  const isOwner = report.reporterId === actor.id;
  const isAdmin = actor.role === "ADMIN";
  if (!isOwner && !isAdmin) return deny("You cannot close this report.");
  if (report.status === "RETURNED") return deny("This item has already been returned.");
  if (report.status === "CLOSED") return deny("This report is already closed.");
  if (report.status === "IN_CUSTODY" && !isAdmin) {
    return deny("This item is at a collection point. Ask the desk to close the report.");
  }
  if (input.hasAcceptedClaim) {
    return deny("This item has an approved claim. Reject or complete the claim first.");
  }
  return allow;
}

/** The person who lost something can mark their own report as resolved. */
export function canResolveLostReport(input: { report: ReportState; actor: Actor }): Decision {
  const { report, actor } = input;
  if (report.kind !== "LOST") return deny("Only a lost report can be marked as recovered.");
  if (report.reporterId !== actor.id) return deny("Only the reporter can do this.");
  if (report.status !== "OPEN") return deny("This report is no longer open.");
  return allow;
}

// --- Scheduling ------------------------------------------------------------------

export const COLLECTION_WINDOW_DAYS = 30;

/** A collection must be in the future, and not unreasonably far away. */
export function isValidCollectionTime(at: Date, now: Date): Decision {
  if (Number.isNaN(at.getTime())) return deny("Enter a valid date and time.");
  if (at.getTime() <= now.getTime()) return deny("Choose a time in the future.");
  const latest = now.getTime() + COLLECTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (at.getTime() > latest) {
    return deny(`Choose a time within the next ${COLLECTION_WINDOW_DAYS} days.`);
  }
  return allow;
}

/** The day an item was found or lost: not in the future, not older than a year. */
export function isValidOccurrenceDate(day: Date, today: Date): Decision {
  if (Number.isNaN(day.getTime())) return deny("Enter a valid date.");
  if (day.getTime() > today.getTime()) return deny("The date cannot be in the future.");
  const oldest = today.getTime() - 366 * 24 * 60 * 60 * 1000;
  if (day.getTime() < oldest) return deny("The date cannot be more than a year ago.");
  return allow;
}
