"use client";

import { EyeOff } from "lucide-react";
import { useState } from "react";
import { createReportAction } from "@/actions/reports";
import {
  ActionForm,
  CheckboxField,
  FileField,
  FormSection,
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
    <ActionForm action={createReportAction} className="space-y-8">
      <input type="hidden" name="kind" value={kind} />

      <FormSection
        id="about"
        title="About the item"
        description={
          found
            ? "What it is, described so the owner recognises it but cannot simply copy it."
            : "What you lost, described so a finder or the desk can recognise it."
        }
      >
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
      </FormSection>

      <FormSection
        id="where"
        title="Where and when"
        description="The place and day narrow the search for everyone."
      >
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
      </FormSection>

      <FormSection
        id="photo"
        title="Photo"
        description="A photo helps, but you decide whether the public sees it."
      >
        <FileField
          name="photo"
          label="Photo of the item"
          optional
          accept="image/jpeg,image/png,image/webp"
          hint="JPEG, PNG or WebP, up to 4 MB."
          preview
        />
        {sensitive ? (
          <p className="flex animate-rise items-start gap-2.5 rounded-lg border border-line bg-paper p-3.5 text-small text-ink-soft">
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
      </FormSection>

      {found && (
        <FormSection
          id="hand-in"
          title="Handing it in"
          description="Drop the item at a staffed collection point. Staff record it when they take it."
        >
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
        </FormSection>
      )}

      <div className="grid gap-x-12 border-t border-line pt-6 lg:grid-cols-[17rem_minmax(0,44rem)]">
        <div className="space-y-4 lg:col-start-2">
          <FormStatus />
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-ink-faint">
              {found
                ? "Your report is published as soon as you submit it."
                : "Your report is published as soon as you submit it. Private details stay with the desk."}
            </p>
            <SubmitButton pendingLabel="Publishing report">Publish report</SubmitButton>
          </div>
        </div>
      </div>
    </ActionForm>
  );
}
