import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

/**
 * The frame around the sign-in and create-account forms: the mark, a title,
 * one line of context, the form on its own card, and a way across to the
 * other form underneath.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="container-page flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-[25rem]">
        <Link href="/" className="mb-8 inline-flex rounded-md" aria-label="CampusTrace home">
          <BrandMark className="size-9" />
        </Link>
        <h1 className="type-page">{title}</h1>
        <p className="mt-2 text-ink-soft">{description}</p>
        <div className="panel mt-8 p-5 shadow-lift sm:p-6">{children}</div>
        <p className="mt-6 text-small text-ink-soft">{footer}</p>
      </div>
    </div>
  );
}
