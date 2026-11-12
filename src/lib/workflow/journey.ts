/**
 * Turns the state of a found item (and, optionally, one claim on it) into the
 * six-step journey shown in the progress tracker.
 *
 * Steps 2 and 3 are independent on purpose: a claim can be approved before
 * the item reaches a collection point, and an item can reach a collection
 * point before anyone claims it. Steps 4 to 6 need both.
 */

import type { ClaimStatus, ReportStatus } from "./rules";

export type JourneyStep = {
  key: "published" | "custody" | "approved" | "scheduled" | "handover" | "receipt";
  label: string;
  hint: string;
  done: boolean;
};

export const JOURNEY_TEMPLATE: ReadonlyArray<Omit<JourneyStep, "done">> = [
  { key: "published", label: "Reported", hint: "The finder's report is published" },
  { key: "custody", label: "In custody", hint: "A collection point is holding the item" },
  { key: "approved", label: "Claim approved", hint: "The owner's evidence checks out" },
  { key: "scheduled", label: "Collection arranged", hint: "A time is set to collect it" },
  { key: "handover", label: "Handed over", hint: "The desk gives the item to its owner" },
  { key: "receipt", label: "Receipt confirmed", hint: "The owner confirms they have it" },
];

const rank: Record<ClaimStatus, number> = {
  REJECTED: -1,
  WITHDRAWN: -1,
  SUBMITTED: 0,
  APPROVED: 1,
  COLLECTION_SCHEDULED: 2,
  HANDED_OVER: 3,
  COMPLETED: 4,
};

export function buildJourney(
  reportStatus: ReportStatus,
  claimStatus: ClaimStatus | null,
): JourneyStep[] {
  // A returned item was necessarily approved, scheduled and handed over, even
  // when the viewer is not allowed to see the claim itself.
  const claimRank = Math.max(
    claimStatus ? rank[claimStatus] : -1,
    reportStatus === "RETURNED" ? rank.HANDED_OVER : -1,
  );
  const inCustody = reportStatus === "IN_CUSTODY" || reportStatus === "RETURNED";
  const done: Record<JourneyStep["key"], boolean> = {
    published: true,
    custody: inCustody,
    approved: claimRank >= 1,
    scheduled: claimRank >= 2,
    handover: claimRank >= 3,
    receipt: claimRank >= 4,
  };
  return JOURNEY_TEMPLATE.map((step) => ({ ...step, done: done[step.key] }));
}

/** Index of the first step that is not done yet, or -1 when all are done. */
export function currentStepIndex(steps: JourneyStep[]): number {
  return steps.findIndex((step) => !step.done);
}
