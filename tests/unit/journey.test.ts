import { describe, expect, it } from "vitest";
import { buildJourney, currentStepIndex } from "@/lib/workflow/journey";

const doneKeys = (...args: Parameters<typeof buildJourney>) =>
  buildJourney(...args)
    .filter((step) => step.done)
    .map((step) => step.key);

describe("the six-step journey", () => {
  it("starts with only the report published", () => {
    expect(doneKeys("OPEN", null)).toEqual(["published"]);
    expect(currentStepIndex(buildJourney("OPEN", null))).toBe(1);
  });

  it("shows an early approval without pretending custody happened", () => {
    expect(doneKeys("OPEN", "APPROVED")).toEqual(["published", "approved"]);
    // The next thing that has to happen is still custody.
    expect(currentStepIndex(buildJourney("OPEN", "APPROVED"))).toBe(1);
  });

  it("shows custody without a claim", () => {
    expect(doneKeys("IN_CUSTODY", "SUBMITTED")).toEqual(["published", "custody"]);
  });

  it("advances through scheduling, handover and receipt", () => {
    expect(doneKeys("IN_CUSTODY", "COLLECTION_SCHEDULED")).toEqual([
      "published",
      "custody",
      "approved",
      "scheduled",
    ]);
    expect(doneKeys("RETURNED", "HANDED_OVER")).toHaveLength(5);
    expect(doneKeys("RETURNED", "COMPLETED")).toHaveLength(6);
    expect(currentStepIndex(buildJourney("RETURNED", "COMPLETED"))).toBe(-1);
  });

  it("shows a returned item as handed over to viewers who cannot see the claim", () => {
    expect(doneKeys("RETURNED", null)).toEqual([
      "published",
      "custody",
      "approved",
      "scheduled",
      "handover",
    ]);
  });

  it("does not count a rejected claim as progress", () => {
    expect(doneKeys("IN_CUSTODY", "REJECTED")).toEqual(["published", "custody"]);
  });
});
