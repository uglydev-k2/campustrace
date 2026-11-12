import { describe, expect, it } from "vitest";
import {
  canApproveClaim,
  canCloseReport,
  canConfirmReceipt,
  canLinkLostReport,
  canRecordCustody,
  canRecordHandover,
  canRejectClaim,
  canResolveLostReport,
  canScheduleCollection,
  canSubmitClaim,
  canWithdrawClaim,
  isValidCollectionTime,
  isValidOccurrenceDate,
  type Actor,
  type ClaimState,
  type ClaimStatus,
  type ReportState,
  type ReportStatus,
} from "@/lib/workflow/rules";

const finder: Actor = { id: "finder", role: "STUDENT" };
const owner: Actor = { id: "owner", role: "STUDENT" };
const stranger: Actor = { id: "stranger", role: "STUDENT" };
const desk: Actor = { id: "desk", role: "ADMIN" };

const foundReport = (status: ReportStatus = "OPEN"): ReportState => ({
  kind: "FOUND",
  status,
  reporterId: finder.id,
});
const lostReport = (status: ReportStatus = "OPEN"): ReportState => ({
  kind: "LOST",
  status,
  reporterId: owner.id,
});
const claim = (status: ClaimStatus): ClaimState => ({ status, claimantId: owner.id });

describe("submitting a claim", () => {
  it("is allowed before the item reaches a collection point", () => {
    const decision = canSubmitClaim({
      report: foundReport("OPEN"),
      actor: owner,
      alreadyClaimedByActor: false,
    });
    expect(decision.ok).toBe(true);
  });

  it("is allowed while the item is in custody", () => {
    const decision = canSubmitClaim({
      report: foundReport("IN_CUSTODY"),
      actor: owner,
      alreadyClaimedByActor: false,
    });
    expect(decision.ok).toBe(true);
  });

  it.each(["RETURNED", "CLOSED"] as const)("is refused once the report is %s", (status) => {
    const decision = canSubmitClaim({
      report: foundReport(status),
      actor: owner,
      alreadyClaimedByActor: false,
    });
    expect(decision.ok).toBe(false);
  });

  it("is refused for the finder's own report", () => {
    const decision = canSubmitClaim({
      report: foundReport(),
      actor: finder,
      alreadyClaimedByActor: false,
    });
    expect(decision).toEqual({ ok: false, reason: expect.stringContaining("You reported this item") });
  });

  it("is refused a second time for the same student", () => {
    const decision = canSubmitClaim({
      report: foundReport(),
      actor: owner,
      alreadyClaimedByActor: true,
    });
    expect(decision.ok).toBe(false);
  });

  it("is refused on a lost report", () => {
    const decision = canSubmitClaim({
      report: lostReport(),
      actor: stranger,
      alreadyClaimedByActor: false,
    });
    expect(decision.ok).toBe(false);
  });

  it("is refused for desk accounts, which decide claims", () => {
    const decision = canSubmitClaim({
      report: foundReport(),
      actor: desk,
      alreadyClaimedByActor: false,
    });
    expect(decision.ok).toBe(false);
  });
});

describe("linking a lost report to a claim", () => {
  it("accepts the claimant's own open lost report", () => {
    expect(canLinkLostReport({ lostReport: lostReport(), actor: owner }).ok).toBe(true);
  });

  it("refuses someone else's lost report", () => {
    expect(canLinkLostReport({ lostReport: lostReport(), actor: stranger }).ok).toBe(false);
  });

  it("refuses a found report", () => {
    expect(canLinkLostReport({ lostReport: foundReport(), actor: finder }).ok).toBe(false);
  });

  it("refuses a lost report that is no longer open", () => {
    expect(canLinkLostReport({ lostReport: lostReport("RETURNED"), actor: owner }).ok).toBe(false);
  });
});

describe("reviewing a claim", () => {
  it("lets the desk approve before custody is recorded", () => {
    const decision = canApproveClaim({
      claim: claim("SUBMITTED"),
      report: foundReport("OPEN"),
      actor: desk,
      anotherClaimAccepted: false,
    });
    expect(decision.ok).toBe(true);
  });

  it("refuses students, including the claimant and the finder", () => {
    for (const actor of [owner, finder, stranger]) {
      const decision = canApproveClaim({
        claim: claim("SUBMITTED"),
        report: foundReport(),
        actor,
        anotherClaimAccepted: false,
      });
      expect(decision.ok).toBe(false);
    }
  });

  it("refuses a second approval on the same item", () => {
    const decision = canApproveClaim({
      claim: claim("SUBMITTED"),
      report: foundReport("IN_CUSTODY"),
      actor: desk,
      anotherClaimAccepted: true,
    });
    expect(decision).toEqual({ ok: false, reason: expect.stringContaining("already been approved") });
  });

  it("refuses to approve a claim that was already decided", () => {
    for (const status of ["APPROVED", "REJECTED", "WITHDRAWN", "COMPLETED"] as const) {
      const decision = canApproveClaim({
        claim: claim(status),
        report: foundReport("IN_CUSTODY"),
        actor: desk,
        anotherClaimAccepted: false,
      });
      expect(decision.ok).toBe(false);
    }
  });

  it("lets the desk reject, or revoke an approval, until the handover", () => {
    for (const status of ["SUBMITTED", "APPROVED", "COLLECTION_SCHEDULED"] as const) {
      expect(canRejectClaim({ claim: claim(status), actor: desk }).ok).toBe(true);
    }
    for (const status of ["HANDED_OVER", "COMPLETED", "REJECTED", "WITHDRAWN"] as const) {
      expect(canRejectClaim({ claim: claim(status), actor: desk }).ok).toBe(false);
    }
  });

  it("does not let students reject claims", () => {
    expect(canRejectClaim({ claim: claim("SUBMITTED"), actor: finder }).ok).toBe(false);
  });
});

describe("the custody gate", () => {
  it("blocks scheduling a collection while the finder still has the item", () => {
    const decision = canScheduleCollection({
      claim: claim("APPROVED"),
      report: foundReport("OPEN"),
      actor: desk,
    });
    expect(decision).toEqual({
      ok: false,
      reason: expect.stringContaining("Custody has not been confirmed"),
    });
  });

  it("allows scheduling once custody is recorded", () => {
    const decision = canScheduleCollection({
      claim: claim("APPROVED"),
      report: foundReport("IN_CUSTODY"),
      actor: desk,
    });
    expect(decision.ok).toBe(true);
  });

  it("allows changing an existing collection time", () => {
    const decision = canScheduleCollection({
      claim: claim("COLLECTION_SCHEDULED"),
      report: foundReport("IN_CUSTODY"),
      actor: desk,
    });
    expect(decision.ok).toBe(true);
  });

  it("blocks scheduling for a claim that is not approved", () => {
    const decision = canScheduleCollection({
      claim: claim("SUBMITTED"),
      report: foundReport("IN_CUSTODY"),
      actor: desk,
    });
    expect(decision.ok).toBe(false);
  });

  it("blocks a handover without custody, even if a collection was somehow scheduled", () => {
    const decision = canRecordHandover({
      claim: claim("COLLECTION_SCHEDULED"),
      report: foundReport("OPEN"),
      actor: desk,
    });
    expect(decision.ok).toBe(false);
  });

  it("blocks a handover before a collection is scheduled", () => {
    const decision = canRecordHandover({
      claim: claim("APPROVED"),
      report: foundReport("IN_CUSTODY"),
      actor: desk,
    });
    expect(decision.ok).toBe(false);
  });

  it("allows the handover when the item is in custody and collection is scheduled", () => {
    const decision = canRecordHandover({
      claim: claim("COLLECTION_SCHEDULED"),
      report: foundReport("IN_CUSTODY"),
      actor: desk,
    });
    expect(decision.ok).toBe(true);
  });

  it("never lets a student schedule or hand over", () => {
    const input = { claim: claim("COLLECTION_SCHEDULED"), report: foundReport("IN_CUSTODY") };
    expect(canScheduleCollection({ ...input, actor: owner }).ok).toBe(false);
    expect(canRecordHandover({ ...input, actor: owner }).ok).toBe(false);
  });
});

describe("recording custody", () => {
  it("is for the desk, on an open found item", () => {
    expect(canRecordCustody({ report: foundReport("OPEN"), actor: desk }).ok).toBe(true);
  });

  it("cannot be recorded twice", () => {
    expect(canRecordCustody({ report: foundReport("IN_CUSTODY"), actor: desk }).ok).toBe(false);
  });

  it("does not apply to lost reports", () => {
    expect(canRecordCustody({ report: lostReport(), actor: desk }).ok).toBe(false);
  });

  it("cannot be recorded by the finder", () => {
    expect(canRecordCustody({ report: foundReport("OPEN"), actor: finder }).ok).toBe(false);
  });
});

describe("the owner's last steps", () => {
  it("lets the claimant confirm receipt after the handover", () => {
    expect(canConfirmReceipt({ claim: claim("HANDED_OVER"), actor: owner }).ok).toBe(true);
  });

  it("does not let them confirm before the handover", () => {
    expect(canConfirmReceipt({ claim: claim("COLLECTION_SCHEDULED"), actor: owner }).ok).toBe(false);
  });

  it("does not let anyone else confirm, not even the desk", () => {
    expect(canConfirmReceipt({ claim: claim("HANDED_OVER"), actor: desk }).ok).toBe(false);
    expect(canConfirmReceipt({ claim: claim("HANDED_OVER"), actor: stranger }).ok).toBe(false);
  });

  it("lets the claimant withdraw until the handover", () => {
    expect(canWithdrawClaim({ claim: claim("SUBMITTED"), actor: owner }).ok).toBe(true);
    expect(canWithdrawClaim({ claim: claim("COLLECTION_SCHEDULED"), actor: owner }).ok).toBe(true);
    expect(canWithdrawClaim({ claim: claim("HANDED_OVER"), actor: owner }).ok).toBe(false);
    expect(canWithdrawClaim({ claim: claim("SUBMITTED"), actor: stranger }).ok).toBe(false);
  });
});

describe("closing a report", () => {
  it("lets the finder withdraw a report while they still hold the item", () => {
    const decision = canCloseReport({ report: foundReport("OPEN"), actor: finder, hasAcceptedClaim: false });
    expect(decision.ok).toBe(true);
  });

  it("does not let the finder close a report once the desk has the item", () => {
    const decision = canCloseReport({
      report: foundReport("IN_CUSTODY"),
      actor: finder,
      hasAcceptedClaim: false,
    });
    expect(decision.ok).toBe(false);
  });

  it("lets the desk close an unclaimed item in custody", () => {
    const decision = canCloseReport({
      report: foundReport("IN_CUSTODY"),
      actor: desk,
      hasAcceptedClaim: false,
    });
    expect(decision.ok).toBe(true);
  });

  it("protects an item with an approved claim", () => {
    const decision = canCloseReport({ report: foundReport("OPEN"), actor: desk, hasAcceptedClaim: true });
    expect(decision.ok).toBe(false);
  });

  it("refuses strangers and already-finished reports", () => {
    expect(canCloseReport({ report: foundReport(), actor: stranger, hasAcceptedClaim: false }).ok).toBe(false);
    expect(canCloseReport({ report: foundReport("RETURNED"), actor: desk, hasAcceptedClaim: false }).ok).toBe(false);
    expect(canCloseReport({ report: foundReport("CLOSED"), actor: desk, hasAcceptedClaim: false }).ok).toBe(false);
  });

  it("lets only the reporter mark a lost item as recovered", () => {
    expect(canResolveLostReport({ report: lostReport(), actor: owner }).ok).toBe(true);
    expect(canResolveLostReport({ report: lostReport(), actor: stranger }).ok).toBe(false);
    expect(canResolveLostReport({ report: lostReport("RETURNED"), actor: owner }).ok).toBe(false);
    expect(canResolveLostReport({ report: foundReport(), actor: finder }).ok).toBe(false);
  });
});

describe("dates", () => {
  const now = new Date("2026-11-12T09:00:00Z");

  it("requires a collection time in the future", () => {
    expect(isValidCollectionTime(new Date("2026-11-12T08:59:00Z"), now).ok).toBe(false);
    expect(isValidCollectionTime(new Date("2026-11-13T10:00:00Z"), now).ok).toBe(true);
  });

  it("refuses a collection time more than 30 days away", () => {
    expect(isValidCollectionTime(new Date("2027-01-15T10:00:00Z"), now).ok).toBe(false);
  });

  it("refuses an invalid collection time", () => {
    expect(isValidCollectionTime(new Date("not a date"), now).ok).toBe(false);
  });

  it("accepts today and the recent past as the day an item was found", () => {
    const today = new Date("2026-11-12T00:00:00Z");
    expect(isValidOccurrenceDate(today, today).ok).toBe(true);
    expect(isValidOccurrenceDate(new Date("2026-10-01T00:00:00Z"), today).ok).toBe(true);
  });

  it("refuses a future date or one more than a year old", () => {
    const today = new Date("2026-11-12T00:00:00Z");
    expect(isValidOccurrenceDate(new Date("2026-11-13T00:00:00Z"), today).ok).toBe(false);
    expect(isValidOccurrenceDate(new Date("2025-01-01T00:00:00Z"), today).ok).toBe(false);
  });
});
