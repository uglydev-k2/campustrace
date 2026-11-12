import type { Tone } from "@/lib/labels";

const TONES: Record<Tone, string> = {
  brand: "border-brand-600 bg-brand-50 text-brand-800",
  lost: "border-lost-700 bg-lost-50 text-lost-800",
  returned: "border-returned-700 bg-returned-50 text-returned-800",
  danger: "border-danger-700 bg-danger-50 text-danger-800",
  neutral: "border-line-strong bg-sunken text-ink-soft",
};

const DOTS: Record<Tone, string> = {
  brand: "bg-brand-600",
  lost: "bg-lost-400",
  returned: "bg-returned-700",
  danger: "bg-danger-700",
  neutral: "bg-ink-faint",
};

/**
 * A small status label. The state is always written out in words; colour
 * only reinforces it, so the badge works for colour-blind readers too.
 */
export function StatusBadge({ text, tone }: { text: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-caption font-bold ${TONES[tone]}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${DOTS[tone]}`} />
      {text}
    </span>
  );
}
