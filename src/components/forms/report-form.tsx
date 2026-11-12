"use client";

import { EyeOff } from "lucide-react";
import { useState } from "react";
import { createReportAction } from "@/actions/reports";
import {
  ActionForm,
  CheckboxField,
  FileField,
  FormStatus,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/forms/form";
import {
  CAMPUS_AREAS,
  CATEGORIES,
  CATEGORY_LABELS,
  SENSITIVE_CATEGORIES,
  type CategoryValue,
} from "@/lib/constants";

type Point = { id: string; name: string; openingHours: string };

/** The form behind both "I found something" and "I lost something". */
export function ReportForm({
  kind,
  today,
  collectionPoints,
}: {
  kind: "FOUND" | "LOST";
  today: string;
  collectionPoints: Point[];
}) {
  const found = kind === "FOUND";
  const [category, setCategory] = useState("");
  const sensitive = SENSITIVE_CATEGORIES.includes(category as CategoryValue);

  return (
    <ActionForm action={createReportAction} className="space-y-10">
      <input type="hidden" name="kind" value={kind} />

      <fieldset className="space-y-5">
        <legend className="type-section mb-5">About the item</legend>
        <TextField
          name="title"
          label="What is it?"
          hint="A short name, such as “Black HP laptop charger”."
          maxLength={80}
        />
        <SelectField
          name="category"
          label="Category"
          placeholder="Choose a category"
          options={CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }))}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
        <TextAreaField
          name="description"
          label={found ? "Public description" : "Description"}
          hint={
            found
              ? "Describe it in general terms. Leave out names, numbers and anything only the owner would know."
              : "Describe it well enough for a finder to recognise it."
          }
          maxLength={600}
        />
        <TextAreaField
          name="privateDetails"
          label={found ? "Details only the owner would know" : "Private details"}
          optional
          hint={
            found
              ? "Seen only by desk staff, who compare it with what a claimant says. For example: the name on a card, a sticker, what is inside."
              : "Seen only by desk staff. For example: a serial number or an engraving."
          }
          maxLength={600}
        />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="type-section mb-5">Where and when</legend>
        <SelectField
          name="area"
          label={found ? "Where did you find it?" : "Where do you think you lost it?"}
          placeholder="Choose a place on campus"
          options={CAMPUS_AREAS.map((area) => ({ value: area, label: area }))}
        />
        <TextField
          name="locationDetail"
          label="More about the spot"
          optional
          hint="For example: “second floor, near the photocopier”."
          maxLength={120}
        />
        <TextField
          name="occurredOn"
          label={found ? "When did you find it?" : "When did you lose it?"}
          type="date"
          max={today}
          defaultValue={today}
        />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="type-section mb-5">Photo</legend>
        <FileField
          name="photo"
          label="Photo of the item"
          optional
          accept="image/jpeg,image/png,image/webp"
          hint="JPEG, PNG or WebP, up to 4 MB."
          preview
        />
        {sensitive ? (
          <p className="flex items-start gap-2.5 rounded-md border border-line-strong bg-sunken px-3 py-2.5 text-small text-ink-soft">
            <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0" />
            Photos of ID and bank cards are never shown publicly. Only desk staff will see this
            one.
          </p>
        ) : (
          <CheckboxField
            name="photoPublic"
            label="Show the photo on the public report"
            hint="Untick this if the photo shows a name, a face, a number or anything else that identifies the owner."
            defaultChecked
          />
        )}
      </fieldset>

      {found && (
        <fieldset className="space-y-5">
          <legend className="type-section mb-5">Handing it in</legend>
          <SelectField
            name="dropOffPointId"
            label="Where will you drop it off?"
            hint="The desk records the item when you hand it over. Until then you are looking after it."
            placeholder="Choose a collection point"
            options={collectionPoints.map((point) => ({
              value: point.id,
              label: `${point.name} (${point.openingHours})`,
            }))}
          />
        </fieldset>
      )}

      <div className="space-y-4 border-t border-line pt-6">
        <FormStatus />
        <SubmitButton pendingLabel="Publishing report">Publish report</SubmitButton>
      </div>
    </ActionForm>
  );
}
