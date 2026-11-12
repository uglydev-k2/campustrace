import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/forms/register-form";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);

  if (await getCurrentUser()) redirect(next);

  const domains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim())
    .filter(Boolean);

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md">
        <h1 className="type-page">Create an account</h1>
        <p className="mt-2 text-ink-soft">
          An account lets the desk reach you about items you report or claim.
        </p>
        <div className="panel mt-8 p-5 sm:p-6">
          <RegisterForm next={next} emailDomains={domains} />
        </div>
        <p className="mt-6 text-ink-soft">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
