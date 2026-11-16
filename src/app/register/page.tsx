import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
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
    <AuthShell
      title="Create an account"
      description="An account lets the desk reach you about items you report or claim."
      footer={
        <>
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="link">
        Sign in
        </Link>
        </>
      }
    >
      <RegisterForm next={next} emailDomains={domains} />
    </AuthShell>
  );
}
