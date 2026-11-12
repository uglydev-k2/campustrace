import { describe, expect, it } from "vitest";
import { detectFileType } from "@/lib/file-types";
import {
  browseSchema,
  claimSchema,
  fieldErrors,
  handoverSchema,
  registerSchema,
  reportSchema,
  scheduleSchema,
} from "@/lib/validation";

const validReport = {
  kind: "FOUND",
  title: "Blue backpack",
  category: "BAGS",
  description: "A blue backpack left under a seat.",
  privateDetails: "",
  area: "Sam Jonah Library",
  locationDetail: "",
  occurredOn: "2026-11-10",
  photoPublic: "on",
  dropOffPointId: "point-1",
};

describe("report form", () => {
  it("accepts a complete report and normalises its values", () => {
    const parsed = reportSchema.parse(validReport);
    expect(parsed.occurredOn.toISOString()).toBe("2026-11-10T00:00:00.000Z");
    expect(parsed.photoPublic).toBe(true);
    // Empty optional fields become undefined, not empty strings.
    expect(parsed.privateDetails).toBeUndefined();
  });

  it("treats an unticked checkbox as false", () => {
    const parsed = reportSchema.parse({ ...validReport, photoPublic: undefined });
    expect(parsed.photoPublic).toBe(false);
  });

  it("reports each invalid field by name", () => {
    const result = reportSchema.safeParse({
      ...validReport,
      title: "ab",
      category: "SPACESHIPS",
      area: "The Moon",
      occurredOn: "yesterday",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(Object.keys(errors).sort()).toEqual(["area", "category", "occurredOn", "title"]);
    }
  });

  it("trims whitespace before checking length", () => {
    const result = reportSchema.safeParse({ ...validReport, title: "   a   " });
    expect(result.success).toBe(false);
  });
});

describe("claim form", () => {
  it("requires a real description and the declaration", () => {
    expect(claimSchema.safeParse({ statement: "It is mine.", declaration: "on" }).success).toBe(false);
    expect(
      claimSchema.safeParse({
        statement: "Blue JanSport with a yellow umbrella and my statistics textbook inside.",
        declaration: undefined,
      }).success,
    ).toBe(false);
    expect(
      claimSchema.safeParse({
        statement: "Blue JanSport with a yellow umbrella and my statistics textbook inside.",
        declaration: "on",
        lostReportId: "",
      }).success,
    ).toBe(true);
  });
});

describe("desk forms", () => {
  it("reads datetime-local input as campus time (UTC+0)", () => {
    const parsed = scheduleSchema.parse({ collectionAt: "2026-11-13T10:00", note: "" });
    expect(parsed.collectionAt.toISOString()).toBe("2026-11-13T10:00:00.000Z");
  });

  it("rejects a malformed collection time", () => {
    expect(scheduleSchema.safeParse({ collectionAt: "tomorrow" }).success).toBe(false);
  });

  it("will not record a handover unless the ID check is ticked", () => {
    expect(handoverSchema.safeParse({ idChecked: undefined }).success).toBe(false);
    expect(handoverSchema.safeParse({ idChecked: "on" }).success).toBe(true);
  });
});

describe("registration", () => {
  it("lowercases the email and enforces a password length", () => {
    const parsed = registerSchema.parse({
      name: "Ama Boateng",
      email: "  Ama.Boateng@STU.ucc.edu.gh ",
      studentNumber: "",
      password: "longenough",
    });
    expect(parsed.email).toBe("ama.boateng@stu.ucc.edu.gh");
    expect(registerSchema.safeParse({ ...parsed, password: "short" }).success).toBe(false);
  });
});

describe("browse filters", () => {
  it("falls back to defaults for anything unexpected in the URL", () => {
    const filters = browseSchema.parse({ kind: "STOLEN", page: "-4", category: ["a", "b"] });
    expect(filters).toEqual({
      q: "",
      kind: "ALL",
      category: "ALL",
      area: "ALL",
      show: "OPEN",
      page: 1,
    });
  });

  it("keeps valid filters", () => {
    const filters = browseSchema.parse({ q: " keys ", kind: "LOST", page: "2" });
    expect(filters.q).toBe("keys");
    expect(filters.kind).toBe("LOST");
    expect(filters.page).toBe(2);
  });
});

describe("upload type detection", () => {
  const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0, 0, 0, 0, 0]);

  it("recognises the allowed formats from their first bytes", () => {
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))?.mimeType).toBe("image/jpeg");
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mimeType).toBe("image/png");
    expect(
      detectFileType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))?.mimeType,
    ).toBe("image/webp");
    expect(detectFileType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))?.mimeType).toBe("application/pdf");
  });

  it("rejects everything else, whatever the file is called", () => {
    const html = new TextEncoder().encode("<script>alert(1)</script>");
    const exe = bytes(0x4d, 0x5a, 0x90, 0x00);
    expect(detectFileType(html)).toBeNull();
    expect(detectFileType(exe)).toBeNull();
    expect(detectFileType(new Uint8Array())).toBeNull();
  });
});
