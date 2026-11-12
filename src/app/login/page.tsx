import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);

  if (await getCurrentUser()) redirect(next);

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md">
        <h1 className="type-page">Sign in</h1>
        <p className="mt-2 text-ink-soft">
          Sign in to report an item, claim one, or check on a return.
        </p>
        <div className="panel mt-8 p-5 sm:p-6">
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-ink-soft">
          New to CampusTrace?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
