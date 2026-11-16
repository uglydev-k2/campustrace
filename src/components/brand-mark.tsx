/**
 * The CampusTrace mark: a property tag with its punched hole, drawn to sit
 * on a 24px grid. Used in the header and on the sign-in pages.
 */
export function BrandMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect width="24" height="24" rx="6" className="fill-brand-600" />
      <path
        d="M7 6.75h6.9l4.35 4.35a1.5 1.5 0 0 1 0 2.12l-5.03 5.03a1.5 1.5 0 0 1-2.12 0L6.75 13.9V7a.25.25 0 0 1 .25-.25Z"
        fill="none"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="10.1" cy="10.1" r="1.25" fill="white" />
    </svg>
  );
}
