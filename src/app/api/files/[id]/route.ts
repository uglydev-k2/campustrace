import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewAttachment } from "@/lib/workflow/access";
import { storage } from "@/server/storage";

/**
 * The only way a browser can read an uploaded file.
 *
 * Uploads are not in /public, so there is no direct URL to guess. Each
 * request is checked against the same access rules the pages use:
 * report photos follow the report's photo visibility, and claim evidence is
 * for the claimant and administrators only.
 *
 * "Not allowed" and "does not exist" both answer 404, so the response never
 * confirms that a private file exists.
 */
export async function GET(_request: Request, context: RouteContext<"/api/files/[id]">) {
  const { id } = await context.params;
  const notFound = new Response("Not found", { status: 404 });

  const attachment = await db.attachment.findUnique({
    where: { id },
    include: {
      report: { select: { status: true, reporterId: true, photoPublic: true, category: true } },
      claim: { select: { claimantId: true } },
    },
  });
  if (!attachment) return notFound;

  const viewer = await getCurrentUser();
  const allowed =
    attachment.purpose === "REPORT_PHOTO"
      ? canViewAttachment(viewer, { purpose: "REPORT_PHOTO", report: attachment.report })
      : canViewAttachment(viewer, { purpose: "CLAIM_EVIDENCE", claim: attachment.claim });
  if (!allowed) return notFound;

  const data = await storage.get(attachment.storageKey);
  if (!data) return notFound;

  const isPdf = attachment.mimeType === "application/pdf";
  return new Response(new Uint8Array(data), {
    headers: {
      // The type was detected from the file's bytes when it was uploaded.
      "Content-Type": attachment.mimeType,
      "Content-Length": String(data.length),
      // Images display in the page; PDFs download instead of opening in a tab.
      "Content-Disposition": isPdf ? 'attachment; filename="evidence.pdf"' : "inline",
      // Never let a shared cache keep a private file.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // A file opened directly cannot run scripts or load anything.
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
