import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/**
 * The band at the top of an inner page: an optional "back" link, the title,
 * one line of context and the page's main actions. Every inner page uses it,
 * so titles sit in the same place wherever you are.
 */
export function PageHeader({
  title,
  description,
  back,
  actions,
  meta,
  children,
  width = "default",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  /** Small items shown above the title, such as a status badge and reference. */
  meta?: React.ReactNode;
  children?: React.ReactNode;
  width?: "default" | "narrow";
}) {
  return (
    <div className="page-header">
      <div className={`container-page py-8 sm:py-10 ${width === "narrow" ? "max-w-3xl" : ""}`}>
        {back && (
          <Link
            href={back.href}
            className="group -ml-1 mb-4 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-small text-ink-soft transition-colors hover:text-ink"
          >
            <ChevronLeft
              aria-hidden
              className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0 max-w-2xl">
            {meta && <div className="mb-3 flex flex-wrap items-center gap-2">{meta}</div>}
            <h1 className="type-page">{title}</h1>
            {description && <p className="mt-2 text-ink-soft">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** A dashed, centred placeholder for lists with nothing in them yet. */
export function EmptyState({
  icon,
  title,
  children,
  actions,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      {icon && (
        <span className="mb-4 grid size-10 place-items-center rounded-lg border border-line bg-surface text-ink-faint shadow-xs">
          {icon}
        </span>
      )}
      <h2 className="type-card">{title}</h2>
      {children && <div className="mt-1.5 max-w-md text-small text-ink-soft">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
