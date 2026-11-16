import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);

  if (await getCurrentUser()) redirect(next);

  return (
    <AuthShell
      title="Sign in"
      description="Sign in to report an item, claim one, or check on a return."
      footer={
        <>
        New to CampusTrace?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="link">
        Create an account
        </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
