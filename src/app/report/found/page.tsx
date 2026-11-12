import type { Metadata } from "next";
import { ReportForm } from "@/components/forms/report-form";
import { requireUser } from "@/lib/auth";
import { todayOnCampus } from "@/lib/format";
import { activeCollectionPoints } from "@/server/queries";

export const metadata: Metadata = { title: "Report a found item" };

export default async function ReportFoundPage() {
  await requireUser("/report/found");
  const points = await activeCollectionPoints();

  return (
    <div className="container-page py-10">
      <div className="max-w-2xl">
        <h1 className="type-page">Report something you found</h1>
        <p className="mt-2 text-ink-soft">
          Your report is published straight away so the owner can find it. Then drop the item at
          a collection point, where staff will look after it until it is claimed.
        </p>
        <div className="mt-10">
          <ReportForm
            kind="FOUND"
            today={todayOnCampus()}
            collectionPoints={points.map(({ id, name, openingHours }) => ({ id, name, openingHours }))}
          />
        </div>
      </div>
    </div>
  );
}
