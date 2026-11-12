/**
 * Zod schemas for everything a user can submit.
 *
 * Server actions parse FormData with these before any business logic runs.
 * Browser-side `required` and `maxlength` attributes are only a convenience;
 * these schemas are the real check.
 */

import { z } from "zod";
import { CAMPUS_AREAS, CATEGORIES } from "@/lib/constants";

/** Turns an empty text field into `undefined` so `.optional()` works on forms. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

const checkbox = z
  .union([z.literal("on"), z.undefined(), z.null()])
  .transform((value) => value === "on");

/** `<input type="date">` sends YYYY-MM-DD. Stored as that day at 00:00 UTC. */
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.")
  .transform((value) => new Date(`${value}T00:00:00Z`))
  .refine((value) => !Number.isNaN(value.getTime()), "Enter a valid date.");

/**
 * `<input type="datetime-local">` sends YYYY-MM-DDTHH:mm with no time zone.
 * The campus is on UTC+0 (Africa/Accra) all year, so campus time is UTC.
 */
const campusDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a date and time.")
  .transform((value) => new Date(`${value}:00Z`))
  .refine((value) => !Number.isNaN(value.getTime()), "Enter a valid date and time.");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter your email address.")),
  password: z.string().min(1, "Enter your password.").max(72),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Keep your name under 80 characters."),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  studentNumber: optionalText(30),
  // bcrypt only reads the first 72 bytes of a password.
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use 72 characters or fewer."),
});

export const reportSchema = z.object({
  kind: z.enum(["FOUND", "LOST"]),
  title: z
    .string()
    .trim()
    .min(3, "Give the item a short name, such as “Black HP laptop”.")
    .max(80, "Keep the name under 80 characters."),
  category: z.enum(CATEGORIES, "Choose a category."),
  description: z
    .string()
    .trim()
    .min(10, "Describe the item in a sentence or two.")
    .max(600, "Keep the description under 600 characters."),
  privateDetails: optionalText(600),
  area: z.enum(CAMPUS_AREAS, "Choose where on campus."),
  locationDetail: optionalText(120),
  occurredOn: dateOnly,
  photoPublic: checkbox,
  dropOffPointId: optionalText(40),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const claimSchema = z.object({
  statement: z
    .string()
    .trim()
    .min(30, "Describe details only the owner would know (at least 30 characters).")
    .max(1500, "Keep your description under 1,500 characters."),
  lostReportId: optionalText(40),
  declaration: z.literal("on", "Confirm that the item is yours."),
});

export type ClaimInput = z.infer<typeof claimSchema>;

export const custodySchema = z.object({
  collectionPointId: z.string().trim().min(1, "Choose the collection point."),
  custodyTag: z
    .string()
    .trim()
    .min(2, "Enter the shelf or tag label.")
    .max(40, "Keep the label under 40 characters."),
});

export const approveSchema = z.object({ note: optionalText(500) });

export const rejectSchema = z.object({
  note: z
    .string()
    .trim()
    .min(10, "Explain the decision so the claimant knows what was missing.")
    .max(500, "Keep the note under 500 characters."),
});

export const scheduleSchema = z.object({
  collectionAt: campusDateTime,
  note: optionalText(300),
});

export const handoverSchema = z.object({
  idChecked: z.literal("on", "Check the collector's student ID before handing over."),
  note: optionalText(300),
});

export const closeReportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Give a short reason.")
    .max(200, "Keep the reason under 200 characters."),
});

/** Query-string filters on the browse page. Bad values fall back to defaults. */
export const browseSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  kind: z.enum(["ALL", "FOUND", "LOST"]).catch("ALL"),
  category: z.enum(["ALL", ...CATEGORIES]).catch("ALL"),
  area: z.enum(["ALL", ...CAMPUS_AREAS]).catch("ALL"),
  show: z.enum(["OPEN", "RETURNED"]).catch("OPEN"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export type BrowseFilters = z.infer<typeof browseSchema>;

/** Field errors keyed by field name, ready to show under each input. */
export type FieldErrors = Record<string, string[] | undefined>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}
