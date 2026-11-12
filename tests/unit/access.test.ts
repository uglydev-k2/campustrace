import { describe, expect, it } from "vitest";
import {
  canViewAttachment,
  canViewClaim,
  canViewReport,
  canViewReportPhoto,
  canViewReportPrivate,
  isPhotoPublic,
  type Viewer,
} from "@/lib/workflow/access";

const anonymous: Viewer = null;
const finder: Viewer = { id: "finder", role: "STUDENT" };
const owner: Viewer = { id: "owner", role: "STUDENT" };
const stranger: Viewer = { id: "stranger", role: "STUDENT" };
const desk: Viewer = { id: "desk", role: "ADMIN" };

const report = (overrides: Partial<Parameters<typeof canViewReportPhoto>[1]> = {}) => ({
  status: "OPEN" as const,
  reporterId: "finder",
  photoPublic: true,
  category: "BAGS",
  ...overrides,
});

describe("who can see a report", () => {
  it("shows open reports to everyone, signed in or not", () => {
    expect(canViewReport(anonymous, report())).toBe(true);
    expect(canViewReport(stranger, report())).toBe(true);
  });

  it("hides closed reports from everyone but the reporter and the desk", () => {
    const closed = report({ status: "CLOSED" });
    expect(canViewReport(anonymous, closed)).toBe(false);
    expect(canViewReport(stranger, closed)).toBe(false);
    expect(canViewReport(finder, closed)).toBe(true);
    expect(canViewReport(desk, closed)).toBe(true);
  });

  it("keeps the finder's private notes between the finder and the desk", () => {
    expect(canViewReportPrivate(anonymous, report())).toBe(false);
    expect(canViewReportPrivate(owner, report())).toBe(false);
    expect(canViewReportPrivate(finder, report())).toBe(true);
    expect(canViewReportPrivate(desk, report())).toBe(true);
  });
});

describe("who can see a report photo", () => {
  it("shows a public photo to everyone", () => {
    expect(isPhotoPublic(report())).toBe(true);
    expect(canViewReportPhoto(anonymous, report())).toBe(true);
  });

  it("respects the reporter's choice to hide the photo", () => {
    const hidden = report({ photoPublic: false });
    expect(canViewReportPhoto(anonymous, hidden)).toBe(false);
    expect(canViewReportPhoto(stranger, hidden)).toBe(false);
    expect(canViewReportPhoto(finder, hidden)).toBe(true);
    expect(canViewReportPhoto(desk, hidden)).toBe(true);
  });

  it("never shows ID and bank card photos publicly, whatever was chosen", () => {
    const card = report({ category: "ID_AND_BANK_CARDS", photoPublic: true });
    expect(isPhotoPublic(card)).toBe(false);
    expect(canViewReportPhoto(stranger, card)).toBe(false);
    expect(canViewReportPhoto(desk, card)).toBe(true);
  });

  it("hides the photo of a closed report", () => {
    expect(canViewReportPhoto(stranger, report({ status: "CLOSED" }))).toBe(false);
  });
});

describe("who can see a claim", () => {
  const claim = { claimantId: "owner" };

  it("shows it to the claimant and the desk", () => {
    expect(canViewClaim(owner, claim)).toBe(true);
    expect(canViewClaim(desk, claim)).toBe(true);
  });

  it("hides it from the finder, other students and visitors", () => {
    expect(canViewClaim(finder, claim)).toBe(false);
    expect(canViewClaim(stranger, claim)).toBe(false);
    expect(canViewClaim(anonymous, claim)).toBe(false);
  });
});

describe("who can download an uploaded file", () => {
  it("applies the claim rule to evidence files", () => {
    const evidence = { purpose: "CLAIM_EVIDENCE" as const, claim: { claimantId: "owner" } };
    expect(canViewAttachment(owner, evidence)).toBe(true);
    expect(canViewAttachment(desk, evidence)).toBe(true);
    expect(canViewAttachment(finder, evidence)).toBe(false);
    expect(canViewAttachment(anonymous, evidence)).toBe(false);
  });

  it("applies the photo rule to report photos", () => {
    const photo = { purpose: "REPORT_PHOTO" as const, report: report({ photoPublic: false }) };
    expect(canViewAttachment(stranger, photo)).toBe(false);
    expect(canViewAttachment(finder, photo)).toBe(true);
  });

  it("refuses a file that is not attached to anything", () => {
    expect(canViewAttachment(desk, { purpose: "CLAIM_EVIDENCE", claim: null })).toBe(false);
    expect(canViewAttachment(desk, { purpose: "REPORT_PHOTO", report: null })).toBe(false);
  });
});
