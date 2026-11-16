"use client";

import { CircleCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

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
  const [dismissed, setDismissed] = useState(false);
  if (!message) return null;

  return (
    <AnimatePresence initial={true}>
      {!dismissed && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 overflow-hidden"
        >
          <div className="flex items-start gap-3 rounded-lg border border-returned-100 bg-returned-50 py-3 pr-2 pl-3.5 text-small text-returned-800">
            <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-returned-700 text-white">
              <CircleCheck aria-hidden className="size-3.5" strokeWidth={2.5} />
            </span>
            <p className="flex-1 font-medium">{message}</p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="-my-1 grid size-7 shrink-0 place-items-center rounded-md text-returned-800/70 transition-colors hover:bg-returned-100 hover:text-returned-800"
            >
              <X aria-hidden className="size-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
