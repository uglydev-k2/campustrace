"use client";

import { CircleCheck } from "lucide-react";
import { motion } from "motion/react";

/**
 * Confirmation banners shown after an action succeeds.
 *
 * Actions redirect to a page with `?notice=<key>`. Only the keys listed here
 * produce a message, so nobody can craft a link that shows arbitrary text.
 */
const NOTICES: Record<string, string> = {
  published: "Report published. It now appears in search.",
  "custody-recorded": "Custody recorded. The finder has been notified.",
  "report-closed": "Report closed. It no longer appears in search.",
  "report-recovered": "Marked as recovered. Glad you have it back.",
  submitted: "Claim submitted. The desk will review your evidence.",
  "claim-approved": "Claim approved. The claimant has been notified.",
  "claim-rejected": "Claim not approved. The claimant has been sent your note.",
  "claim-withdrawn": "Claim withdrawn.",
  "collection-scheduled": "Collection time saved. The claimant has been notified.",
  "handover-recorded": "Handover recorded. The owner has been asked to confirm receipt.",
  "receipt-confirmed": "Receipt confirmed. This return is complete.",
  welcome: "Account created. You are signed in.",
};

export function Notice({ code }: { code: string | undefined }) {
  const message = code ? NOTICES[code] : undefined;
  if (!message) return null;

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6 flex items-start gap-2.5 rounded-md border border-returned-700 bg-returned-50 px-4 py-3 font-bold text-returned-800"
    >
      <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
      {message}
    </motion.div>
  );
}
