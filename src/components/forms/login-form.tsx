"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

/**
 * Signs in through NextAuth's credentials provider.
 * `redirect: false` lets us show an error in place instead of leaving the page.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (result?.ok) {
      router.push(next);
      router.refresh();
      return;
    }
    setPending(false);
    // Deliberately vague: we do not reveal whether the email exists.
    setError("That email and password do not match. Check both and try again.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="field-label">
          University email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field-input"
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>

      {error && (
        <p
          id="login-error"
          role="alert"
          className="flex animate-rise items-start gap-2 rounded-md border border-danger-700 bg-danger-50 px-3 py-2.5 text-small font-bold text-danger-800"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" aria-disabled={pending}>
        {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
