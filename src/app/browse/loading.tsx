import { Bar, HeaderSkeleton, TagGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading items</span>
      <HeaderSkeleton withFilters />
      <div className="container-page pt-8">
        <Bar className="mb-4 h-4 w-16" />
        <TagGridSkeleton count={9} />
      </div>
    </div>
  );
}
