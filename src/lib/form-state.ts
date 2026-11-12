import type { FieldErrors } from "@/lib/validation";

/**
 * What every form-handling server action returns.
 * The form reads it with React's `useActionState` and shows the message and
 * the per-field errors.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
};

export const idleState: FormState = { status: "idle" };

export const errorState = (message: string, fieldErrors?: FieldErrors): FormState => ({
  status: "error",
  message,
  fieldErrors,
});

export const successState = (message: string): FormState => ({ status: "success", message });

/** Reads a text field from FormData (ignores files). */
export function formText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}
