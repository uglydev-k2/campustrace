/**
 * The words and colours used for each workflow state.
 * Keeping them in one place means a status is always called the same thing.
 */

import type { ClaimStatus, ReportKind, ReportStatus } from "@/lib/workflow/rules";

export type Tone = "brand" | "lost" | "returned" | "danger" | "neutral";

export function reportStatusLabel(kind: ReportKind, status: ReportStatus): { text: string; tone: Tone } {
  if (status === "CLOSED") return { text: "Closed", tone: "neutral" };
  if (kind === "LOST") {
    return status === "RETURNED"
      ? { text: "Recovered", tone: "returned" }
      : { text: "Still missing", tone: "lost" };
  }
  if (status === "RETURNED") return { text: "Returned to owner", tone: "returned" };
  if (status === "IN_CUSTODY") return { text: "At a collection point", tone: "brand" };
  return { text: "With the finder", tone: "neutral" };
}

const CLAIM_LABELS: Record<ClaimStatus, { text: string; tone: Tone }> = {
  SUBMITTED: { text: "Under review", tone: "neutral" },
  APPROVED: { text: "Approved", tone: "brand" },
  COLLECTION_SCHEDULED: { text: "Collection arranged", tone: "brand" },
  HANDED_OVER: { text: "Handed over", tone: "returned" },
  COMPLETED: { text: "Completed", tone: "returned" },
  REJECTED: { text: "Not approved", tone: "danger" },
  WITHDRAWN: { text: "Withdrawn", tone: "neutral" },
};

export const claimStatusLabel = (status: ClaimStatus) => CLAIM_LABELS[status];

export const kindLabel = (kind: ReportKind) => (kind === "FOUND" ? "Found" : "Lost");
