"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { errorState, formText, type FormState } from "@/lib/form-state";
import {
  approveSchema,
  claimSchema,
  fieldErrors,
  handoverSchema,
  rejectSchema,
  scheduleSchema,
} from "@/lib/validation";
import {
  approveClaim,
  confirmReceipt,
  recordHandover,
  rejectClaim,
  scheduleCollection,
  submitClaim,
  withdrawClaim,
} from "@/server/services/claims";
import { readUploads } from "@/server/uploads";
import { attempt } from "./run";

// --- The owner's actions -------------------------------------------------------

export async function submitClaimAction(
  reportId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/reports/${reportId}/claim`);

  const parsed = claimSchema.safeParse({
    statement: formText(formData, "statement"),
    lostReportId: formText(formData, "lostReportId"),
    declaration: formText(formData, "declaration"),
  });
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", fieldErrors(parsed.error));
  }

  const evidence = await readUploads(formData.getAll("evidence"), {
    kind: "evidence",
    maxFiles: UPLOAD_LIMITS.maxEvidenceFiles,
  });
  if (!evidence.ok) return errorState(evidence.message, { evidence: [evidence.message] });

  let claimId = "";
  const failure = await attempt(async () => {
    const claim = await submitClaim(user, reportId, parsed.data, evidence.uploads);
    claimId = claim.id;
  });
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/claims/${claimId}?notice=submitted`);
}

export async function withdrawClaimAction(
  claimId: string,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/claims/${claimId}`);
  const failure = await attempt(() => withdrawClaim(user, claimId));
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/claims/${claimId}?notice=claim-withdrawn`);
}

export async function confirmReceiptAction(
  claimId: string,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/claims/${claimId}`);
  const failure = await attempt(() => confirmReceipt(user, claimId));
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/claims/${claimId}?notice=receipt-confirmed`);
}

// --- The administrator's actions -----------------------------------------------
// The role check is inside each service's rule (canApproveClaim and so on),
// so a student who calls these actions directly gets a refusal, not a result.

export async function approveClaimAction(
  claimId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/claims/${claimId}`);
  const parsed = approveSchema.safeParse({ note: formText(formData, "note") });
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", fieldErrors(parsed.error));
  }

  const failure = await attempt(() => approveClaim(user, claimId, parsed.data.note));
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/claims/${claimId}?notice=claim-approved`);
}

export async function rejectClaimAction(
  claimId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/claims/${claimId}`);
  const parsed = rejectSchema.safeParse({ note: formText(formData, "note") });
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", fieldErrors(parsed.error));
  }

  const failure = await attempt(() => rejectClaim(user, claimId, parsed.data.note));
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/claims/${claimId}?notice=claim-rejected`);
}

export async function scheduleCollectionAction(
  claimId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/claims/${claimId}`);
  const parsed = scheduleSchema.safeParse({
    collectionAt: formText(formData, "collectionAt"),
    note: formText(formData, "note"),
  });
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", fieldErrors(parsed.error));
  }

  const failure = await attempt(() => scheduleCollection(user, claimId, parsed.data));
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/claims/${claimId}?notice=collection-scheduled`);
}

export async function recordHandoverAction(
  claimId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/claims/${claimId}`);
  const parsed = handoverSchema.safeParse({
    idChecked: formText(formData, "idChecked"),
    note: formText(formData, "note"),
  });
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", fieldErrors(parsed.error));
  }

  const failure = await attempt(() => recordHandover(user, claimId, { note: parsed.data.note }));
  if (failure) return failure;

  revalidatePath("/", "layout");
  redirect(`/claims/${claimId}?notice=handover-recorded`);
}
