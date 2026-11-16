"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import type { JourneyStep } from "@/lib/workflow/journey";

/**
 * The six-stop return journey.
 *
 * mode="explain"   every stop is numbered: used on the home page to show how
 *                  a return works.
 * mode="progress"  finished stops are ticked and the next one pulses: used on
 *                  report and claim pages to show where an item is.
 *
 * It is a vertical list in narrow spaces and a horizontal track in wide ones. Motion staggers the stops in and draws the connecting line
 * when the track scrolls into view. The line's length is driven by a CSS
 * variable (--draw) so the same animation works in both orientations.
 */

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
};

const stop: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// Motion can animate CSS custom properties; the cast tells TypeScript so.
const line = {
  hidden: { "--draw": 0 },
  show: { "--draw": 1, transition: { duration: 0.5, ease: "easeOut" } },
} as unknown as Variants;

type StopState = "numbered" | "done" | "current" | "upcoming";

const MARKER: Record<StopState, string> = {
  numbered: "border-line-strong bg-surface text-ink",
  done: "border-returned-700 bg-returned-700 text-white",
  current: "border-brand-600 bg-surface text-brand-700 animate-pulse-dot",
  upcoming: "border-line-strong bg-surface text-ink-faint",
};

const STATE_TEXT: Record<StopState, string> = {
  numbered: "",
  done: "Done: ",
  current: "Current step: ",
  upcoming: "Not yet: ",
};

export function JourneyTrack({
  steps,
  mode = "progress",
}: {
  steps: JourneyStep[];
  mode?: "progress" | "explain";
}) {
  const reduceMotion = useReducedMotion();
  const currentIndex = mode === "progress" ? steps.findIndex((step) => !step.done) : -1;

  return (
    // A container query (@2xl) switches to the horizontal track when the
    // track's own box is wide enough, whatever the screen size.
    <div className="@container">
    <motion.ol
      variants={list}
      // With reduced motion the track simply appears in its final state.
      initial={reduceMotion ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      className="grid @2xl:grid-cols-6"
    >
      {steps.map((step, index) => {
        const state: StopState =
          mode === "explain"
            ? "numbered"
            : step.done
              ? "done"
              : index === currentIndex
                ? "current"
                : "upcoming";
        const next = steps[index + 1];
        // A segment is drawn solid once the stops at both of its ends are done.
        const segmentDone = mode === "explain" || (step.done && next?.done);

        return (
          <motion.li
            key={step.key}
            variants={stop}
            aria-current={state === "current" ? "step" : undefined}
            className="relative flex gap-3.5 pb-6 last:pb-0 @2xl:block @2xl:pr-6 @2xl:pb-0"
          >
            {next && (
              <span
                aria-hidden
                className="absolute top-8 bottom-1 left-[13.5px] w-px bg-line-strong @2xl:top-[14px] @2xl:right-1.5 @2xl:bottom-auto @2xl:left-9 @2xl:h-px @2xl:w-auto"
              >
                {segmentDone && (
                  <motion.span
                    variants={line}
                    className={`absolute inset-0 origin-top scale-y-(--draw) @2xl:origin-left @2xl:scale-x-(--draw) @2xl:scale-y-100 ${
                      mode === "explain" ? "bg-navy-700" : "bg-returned-700"
                    }`}
                  />
                )}
              </span>
            )}

            <span
              className={`type-reference relative z-10 grid size-7 shrink-0 place-items-center rounded-full border text-caption ${MARKER[state]}`}
            >
              {state === "done" ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>

            <div className="pt-0.5 @2xl:mt-3 @2xl:pt-0">
              <p className={`text-small font-medium ${state === "upcoming" ? "text-ink-faint" : "text-ink"}`}>
                <span className="sr-only">{STATE_TEXT[state]}</span>
                {step.label}
              </p>
              <p className="mt-0.5 text-caption text-ink-soft">{step.hint}</p>
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
    </div>
  );
}
