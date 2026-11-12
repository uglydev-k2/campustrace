"use client";

import {
  approveClaimAction,
  confirmReceiptAction,
  recordHandoverAction,
  rejectClaimAction,
  scheduleCollectionAction,
  withdrawClaimAction,
} from "@/actions/claims";
import { closeReportAction, recordCustodyAction, resolveLostReportAction } from "@/actions/reports";
import {
  ActionForm,
  CheckboxField,
  FormStatus,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/forms/form";

/**
 * The small forms that move an item through the workflow.
 *
 * Each one posts to a server action bound to the report or claim id. Showing
 * a form is only a convenience: the server checks the rule again, so hiding
 * or revealing a form in the browser changes nothing about who may do what.
 */

// --- Desk: reports ---------------------------------------------------------------

export function CustodyForm({
  reportId,
  points,
  plannedPointId,
}: {
  reportId: string;
  points: { id: string; name: string }[];
  plannedPointId: string | null;
}) {
  return (
    <ActionForm action={recordCustodyAction.bind(null, reportId)} className="space-y-4">
      <SelectField
        name="collectionPointId"
        label="Collection point holding the item"
        placeholder="Choose a collection point"
        options={points.map((point) => ({ value: point.id, label: point.name }))}
        defaultValue={plannedPointId ?? ""}
      />
      <TextField
        name="custodyTag"
        label="Shelf or tag label"
        hint="Where the item is stored, so any desk officer can find it. For example: LIB-A3."
        maxLength={40}
      />
      <FormStatus />
      <SubmitButton pendingLabel="Recording custody">Record custody</SubmitButton>
    </ActionForm>
  );
}

export function CloseReportForm({ reportId, byAdmin }: { reportId: string; byAdmin: boolean }) {
  return (
    <ActionForm action={closeReportAction.bind(null, reportId)} className="space-y-4">
      <TextField
        name="reason"
        label="Reason for closing"
        hint={
          byAdmin
            ? "The reporter is shown this reason."
            : "For example: “posted by mistake” or “the owner collected it from me”."
        }
        maxLength={200}
      />
      <FormStatus />
      <SubmitButton pendingLabel="Closing report" className="btn btn-danger">
        Close report
      </SubmitButton>
    </ActionForm>
  );
}

export function ResolveLostForm({ reportId }: { reportId: string }) {
  return (
    <ActionForm action={resolveLostReportAction.bind(null, reportId)} className="space-y-3">
      <FormStatus />
      <SubmitButton pendingLabel="Saving">I have it back</SubmitButton>
    </ActionForm>
  );
}

// --- Desk: claims ----------------------------------------------------------------

export function ApproveClaimForm({ claimId }: { claimId: string }) {
  return (
    <ActionForm action={approveClaimAction.bind(null, claimId)} className="space-y-4">
      <TextAreaField
        name="note"
        fieldId="approve-note"
        label="Note to the claimant"
        optional
        rows={2}
        maxLength={500}
      />
      <FormStatus />
      <SubmitButton pendingLabel="Approving claim">Approve claim</SubmitButton>
    </ActionForm>
  );
}

export function RejectClaimForm({ claimId, revoking }: { claimId: string; revoking: boolean }) {
  return (
    <ActionForm action={rejectClaimAction.bind(null, claimId)} className="space-y-4">
      <TextAreaField
        name="note"
        fieldId="reject-note"
        label={revoking ? "Why is the approval being withdrawn?" : "What was missing?"}
        hint="The claimant reads this, so say what did not match without revealing the finder's private notes."
        rows={3}
        maxLength={500}
      />
      <FormStatus />
      <SubmitButton
        pendingLabel={revoking ? "Withdrawing approval" : "Saving decision"}
        className="btn btn-danger"
      >
        {revoking ? "Withdraw approval" : "Do not approve"}
      </SubmitButton>
    </ActionForm>
  );
}

export function ScheduleCollectionForm({
  claimId,
  minDateTime,
  current,
  currentNote,
}: {
  claimId: string;
  /** Earliest selectable time, as YYYY-MM-DDTHH:mm in campus time. */
  minDateTime: string;
  current: string | null;
  currentNote: string | null;
}) {
  return (
    <ActionForm action={scheduleCollectionAction.bind(null, claimId)} className="space-y-4">
      <TextField
        name="collectionAt"
        label="Collection date and time"
        hint="Campus time (GMT). Choose a time when the collection point is open."
        type="datetime-local"
        min={minDateTime}
        defaultValue={current ?? undefined}
      />
      <TextAreaField
        name="note"
        fieldId="schedule-note"
        label="Instructions for the owner"
        optional
        rows={2}
        maxLength={300}
        defaultValue={currentNote ?? undefined}
      />
      <FormStatus />
      <SubmitButton pendingLabel="Saving collection time">
        {current ? "Change collection time" : "Schedule collection"}
      </SubmitButton>
    </ActionForm>
  );
}

export function HandoverForm({ claimId }: { claimId: string }) {
  return (
    <ActionForm action={recordHandoverAction.bind(null, claimId)} className="space-y-4">
      <CheckboxField
        name="idChecked"
        label="I checked the collector's student ID against this claim"
        hint="Recording a handover cannot be undone."
      />
      <TextAreaField
        name="note"
        fieldId="handover-note"
        label="Handover note"
        optional
        rows={2}
        maxLength={300}
      />
      <FormStatus />
      <SubmitButton pendingLabel="Recording handover">Record handover</SubmitButton>
    </ActionForm>
  );
}

// --- Owner -------------------------------------------------------------------------

export function ConfirmReceiptForm({ claimId }: { claimId: string }) {
  return (
    <ActionForm action={confirmReceiptAction.bind(null, claimId)} className="space-y-3">
      <FormStatus />
      <SubmitButton pendingLabel="Confirming">I have received my item</SubmitButton>
    </ActionForm>
  );
}

export function WithdrawClaimForm({ claimId }: { claimId: string }) {
  return (
    <ActionForm action={withdrawClaimAction.bind(null, claimId)} className="space-y-3">
      <p className="text-small text-ink-soft">
        Withdrawing is final. You will not be able to claim this item again.
      </p>
      <FormStatus />
      <SubmitButton pendingLabel="Withdrawing claim" className="btn btn-danger">
        Withdraw my claim
      </SubmitButton>
    </ActionForm>
  );
}
