"use client";

import { signIn } from "next-auth/react";
import { registerAction } from "@/actions/account";
import { ActionForm, FormStatus, SubmitButton, TextField } from "@/components/forms/form";
import { errorState, type FormState } from "@/lib/form-state";

export function RegisterForm({ next, emailDomains }: { next: string; emailDomains: string[] }) {
  // Create the account on the server, then sign in with the same details.
  async function registerAndSignIn(previous: FormState, formData: FormData): Promise<FormState> {
    const result = await registerAction(previous, formData);
    if (result.status !== "success") return result;

    const signedIn = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    if (!signedIn?.ok) {
      return errorState("Your account was created, but we could not sign you in. Try signing in.");
    }
    // A full page load so the header picks up the new session.
    window.location.assign(next);
    return result;
  }

  const emailHint =
    emailDomains.length > 0
      ? `Use your ${emailDomains.map((domain) => `@${domain}`).join(" or ")} address.`
      : undefined;

  return (
    <ActionForm action={registerAndSignIn} className="space-y-5">
      <TextField name="name" label="Full name" autoComplete="name" maxLength={80} />
      <TextField
        name="email"
        label="University email"
        type="email"
        autoComplete="username"
        hint={emailHint}
      />
      <TextField
        name="studentNumber"
        label="Student number"
        optional
        hint="Helps the desk confirm your identity at collection."
        maxLength={30}
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        minLength={8}
        maxLength={72}
      />
      <FormStatus />
      <SubmitButton pendingLabel="Creating account" className="btn btn-primary w-full">
        Create account
      </SubmitButton>
    </ActionForm>
  );
}
