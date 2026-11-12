"use client";

import { submitClaimAction } from "@/actions/claims";
import {
  ActionForm,
  CheckboxField,
  FileField,
  FormStatus,
  SelectField,
  SubmitButton,
  TextAreaField,
} from "@/components/forms/form";

export function ClaimForm({
  reportId,
  lostReports,
}: {
  reportId: string;
  lostReports: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={submitClaimAction.bind(null, reportId)} className="space-y-6">
      <TextAreaField
        name="statement"
        label="How can you show it is yours?"
        hint="Describe things the public report does not mention: marks, contents, a lock-screen picture, where exactly you left it. Desk staff compare this with the finder's private notes."
        rows={6}
        maxLength={1500}
      />

      <FileField
        name="evidence"
        label="Supporting files"
        optional
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        hint="Up to 3 files, 4 MB each: a receipt, a photo of you with the item, the box it came in. JPEG, PNG, WebP or PDF."
      />

      {lostReports.length > 0 && (
        <SelectField
          name="lostReportId"
          label="Link your lost report"
          optional
          hint="If you reported this item as lost, linking that report strengthens your claim."
          placeholder="Do not link a report"
          options={lostReports.map((report) => ({ value: report.id, label: report.label }))}
        />
      )}

      <CheckboxField
        name="declaration"
        label="This item is mine and what I have written is true"
        hint="The desk checks your student ID before handing anything over."
      />

      <div className="space-y-4 border-t border-line pt-6">
        <FormStatus />
        <SubmitButton pendingLabel="Submitting claim">Submit claim</SubmitButton>
      </div>
    </ActionForm>
  );
}
