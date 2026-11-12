"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { errorState, formText, type FormState } from "@/lib/form-state";
import { closeReportSchema, custodySchema, fieldErrors, reportSchema } from "@/lib/validation";
import { closeReport, createReport, recordCustody, resolveLostReport } from "@/server/services/reports";
import { readUploads } from "@/server/uploads";
import { attempt } from "./run";

/**
 * Every action follows the same four steps:
 *   1. find out who is asking (requireUser)
 *   2. validate what they sent (Zod)
 *   3. call a service, which enforces the workflow rules in a transaction
 *   4. on success redirect with a `?notice=` key (see components/notice.tsx);
 *      on failure return a message for the form to show
 */

export async function createReportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const kind = formText(formData, "kind") === "LOST" ? "LOST" : "FOUND";
  const user = await requireUser(kind === "LOST" ? "/report/lost" : "/report/found");

  const parsed = reportSchema.safeParse({
    kind,
    title: formText(formData, "title"),
    category: formText(formData, "category"),
    description: formText(formData, "description"),
    privateDetails: formText(formData, "privateDetails"),
    area: formText(formData, "area"),
    locationDetail: formText(formData, "locationDetail"),
    occurredOn: formText(formData, "occurredOn"),
    photoPublic: formText(formData, "photoPublic"),
    dropOffPointId: formText(formData, "dropOffPointId"),
  });
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", fieldErrors(parsed.error));
  }

  const photo = await readUploads(formData.getAll("photo"), { kind: "photo", maxFiles: 1 });
  if (!photo.ok) return errorState(photo.message, { photo: [photo.message] });

  let reportId = "";
  const failure = await attempt(async () => {
    const report = await createReport(user, parsed.data, photo.uploads[0] ?? null);
    reportId = report.id;
  });
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/reports/${reportId}?notice=published`);
}

export async function recordCustodyAction(
  reportId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/reports/${reportId}`);
  const parsed = custodySchema.safeParse({
    collectionPointId: formText(formData, "collectionPointId"),
    custodyTag: formText(formData, "custodyTag"),
  });
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", fieldErrors(parsed.error));
  }

  const failure = await attempt(() => recordCustody(user, reportId, parsed.data));
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/reports/${reportId}?notice=custody-recorded`);
}

export async function closeReportAction(
  reportId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/reports/${reportId}`);
  const parsed = closeReportSchema.safeParse({ reason: formText(formData, "reason") });
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", fieldErrors(parsed.error));
  }

  const failure = await attempt(() => closeReport(user, reportId, parsed.data.reason));
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/reports/${reportId}?notice=report-closed`);
}

export async function resolveLostReportAction(
  reportId: string,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/reports/${reportId}`);
  const failure = await attempt(() => resolveLostReport(user, reportId));
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/reports/${reportId}?notice=report-recovered`);
}
