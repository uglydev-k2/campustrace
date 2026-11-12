import type { Metadata } from "next";
import Link from "next/link";
import { ReportForm } from "@/components/forms/report-form";
import { requireUser } from "@/lib/auth";
import { todayOnCampus } from "@/lib/format";

export const metadata: Metadata = { title: "Report a lost item" };

export default async function ReportLostPage() {
  await requireUser("/report/lost");

  return (
    <div className="container-page py-10">
      <div className="max-w-2xl">
        <h1 className="type-page">Report something you lost</h1>
        <p className="mt-2 text-ink-soft">
          Publishing a lost report tells finders and the desk what to look out for. If you later
          claim a found item, you can attach this report as supporting evidence. Before you
          start,{" "}
          <Link href="/browse?kind=FOUND" className="link">
            check whether it has already been found
          </Link>
          .
        </p>
        <div className="mt-10">
          <ReportForm kind="LOST" today={todayOnCampus()} collectionPoints={[]} />
        </div>
      </div>
    </div>
  );
}
