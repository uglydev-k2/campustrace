/**
 * Who may see what.
 *
 * Like rules.ts these functions are pure, so the privacy rules can be unit
 * tested without a database. Pages, server actions and the file route all go
 * through them, so there is one place to read and one place to change.
 */

import type { Actor, ReportStatus } from "./rules";

/** `null` means a visitor who is not signed in. */
export type Viewer = Actor | null;

export const isAdmin = (viewer: Viewer): boolean => viewer?.role === "ADMIN";

type ReportAccess = {
  status: ReportStatus;
  reporterId: string;
  photoPublic: boolean;
  category: string;
};

const SENSITIVE = ["ID_AND_BANK_CARDS"];

/** Closed reports disappear from public view but stay visible to their owner. */
export function canViewReport(viewer: Viewer, report: Pick<ReportAccess, "status" | "reporterId">) {
  if (report.status !== "CLOSED") return true;
  return isAdmin(viewer) || viewer?.id === report.reporterId;
}

/**
 * The reporter's private notes, their identity, and custody storage details
 * are only for the reporter and administrators.
 */
export function canViewReportPrivate(viewer: Viewer, report: Pick<ReportAccess, "reporterId">) {
  return isAdmin(viewer) || viewer?.id === report.reporterId;
}

/** True when the photo may be shown to anyone, signed in or not. */
export function isPhotoPublic(report: Pick<ReportAccess, "status" | "photoPublic" | "category">) {
  if (report.status === "CLOSED") return false;
  if (SENSITIVE.includes(report.category)) return false;
  return report.photoPublic;
}

export function canViewReportPhoto(viewer: Viewer, report: ReportAccess) {
  return isPhotoPublic(report) || canViewReportPrivate(viewer, report);
}

/**
 * A claim holds the owner's private evidence. Only the claimant and
 * administrators can open it. In particular the finder cannot.
 */
export function canViewClaim(viewer: Viewer, claim: { claimantId: string }) {
  return isAdmin(viewer) || (viewer !== null && viewer.id === claim.claimantId);
}

export type AttachmentAccess =
  | { purpose: "REPORT_PHOTO"; report: ReportAccess | null }
  | { purpose: "CLAIM_EVIDENCE"; claim: { claimantId: string } | null };

export function canViewAttachment(viewer: Viewer, attachment: AttachmentAccess) {
  if (attachment.purpose === "REPORT_PHOTO") {
    return attachment.report !== null && canViewReportPhoto(viewer, attachment.report);
  }
  return attachment.claim !== null && canViewClaim(viewer, attachment.claim);
}
