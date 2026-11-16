import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ReportForm } from "@/components/forms/report-form";
import { requireUser } from "@/lib/auth";
import { todayOnCampus } from "@/lib/format";
import { activeCollectionPoints } from "@/server/queries";

export const metadata: Metadata = { title: "Report a found item" };

export default async function ReportFoundPage() {
  await requireUser("/report/found");
  const points = await activeCollectionPoints();

  return (
    <>
      <PageHeader
        title="Report something you found"
        description="Your report is published straight away so the owner can find it. Then drop the item at a collection point, where staff will look after it until it is claimed."
      />
      <div className="container-page pt-10">
        <ReportForm
          kind="FOUND"
          today={todayOnCampus()}
          collectionPoints={points.map(({ id, name, openingHours }) => ({ id, name, openingHours }))}
        />
      </div>
    </>
  );
}
