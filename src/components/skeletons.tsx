/**
 * Placeholders shown by a route's loading.tsx while its data loads. They
 * mirror the real layout, so nothing jumps when the content arrives. Hidden
 * from screen readers: the busy state is announced by aria-busy instead.
 *
 * Only public routes get a loading.tsx. A loading screen makes Next.js send
 * the response headers straight away, so a page that later decides the
 * visitor may not see it (notFound, redirect to sign in) could no longer
 * answer with a 404 or a redirect. Pages behind a permission check therefore
 * render in one piece.
 */

export function Bar({ className }: { className: string }) {
  return <span aria-hidden className={`skeleton block ${className}`} />;
}

export function HeaderSkeleton({ withFilters = false }: { withFilters?: boolean }) {
  return (
    <div className="page-header">
      <div className="container-page py-8 sm:py-10">
        <Bar className="h-8 w-64 max-w-full" />
        <Bar className="mt-3 h-4 w-[32rem] max-w-full" />
        {withFilters && (
          <div className="mt-8 space-y-3">
            <Bar className="h-10 w-full" />
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_8rem]">
              <Bar className="h-10" />
              <Bar className="h-10" />
              <Bar className="h-10" />
              <Bar className="hidden h-10 lg:block" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TagSkeleton() {
  return (
    <div aria-hidden className="rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-dashed border-line px-3.5 py-2.5">
        <Bar className="size-2.5 rounded-full" />
        <Bar className="h-3 w-12" />
        <Bar className="ml-auto h-3 w-16" />
      </div>
      <div className="flex gap-3.5 p-3.5">
        <Bar className="size-16 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <Bar className="h-4 w-3/4" />
          <Bar className="h-3 w-1/2" />
          <Bar className="h-3 w-2/5" />
        </div>
      </div>
      <div className="px-3.5 pb-3.5">
        <Bar className="h-5 w-28" />
      </div>
    </div>
  );
}

export function TagGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <TagSkeleton key={index} />
      ))}
    </div>
  );
}
