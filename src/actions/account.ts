"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { errorState, formText, successState, type FormState } from "@/lib/form-state";
import { fieldErrors, registerSchema } from "@/lib/validation";

/** Comma-separated list in ALLOWED_EMAIL_DOMAINS. Empty means any domain. */
function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Creates a student account. The form signs the new user in afterwards.
 * New accounts are always students; administrators are created by the seed
 * script or directly in the database.
 */
export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formText(formData, "name"),
    email: formText(formData, "email"),
    studentNumber: formText(formData, "studentNumber"),
    password: formText(formData, "password"),
  });
  if (!parsed.success) {
    return errorState("Check the highlighted fields.", fieldErrors(parsed.error));
  }
  const { name, email, studentNumber, password } = parsed.data;

  const domains = allowedDomains();
  const domain = email.split("@")[1] ?? "";
  if (domains.length > 0 && !domains.includes(domain)) {
    return errorState("Check the highlighted fields.", {
      email: [`Use your university email (${domains.map((d) => `@${d}`).join(" or ")}).`],
    });
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return errorState("Check the highlighted fields.", {
      email: ["An account with this email already exists. Sign in instead."],
    });
  }

  await db.user.create({
    data: {
      name,
      email,
      studentNumber,
      passwordHash: await bcrypt.hash(password, 10),
      role: "STUDENT",
    },
  });
  return successState("Account created.");
}
