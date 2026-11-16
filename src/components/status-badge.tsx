import type { Tone } from "@/lib/labels";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-800 ring-brand-100",
  lost: "bg-lost-50 text-lost-800 ring-lost-100",
  returned: "bg-returned-50 text-returned-800 ring-returned-100",
  danger: "bg-danger-50 text-danger-800 ring-danger-100",
  neutral: "bg-sunken text-ink-soft ring-line",
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
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-caption font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${DOTS[tone]}`} />
      {text}
    </span>
  );
}
