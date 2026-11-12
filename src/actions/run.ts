import "server-only";
import { errorState, type FormState } from "@/lib/form-state";
import { WorkflowError } from "@/server/services/shared";

/**
 * Runs a service call and turns a rule violation into a form message.
 * Returns null on success so the caller can redirect or report success.
 *
 * Unexpected errors are logged on the server and shown as a generic message,
 * so internal details never reach the browser.
 */
export async function attempt(work: () => Promise<unknown>): Promise<FormState | null> {
  try {
    await work();
    return null;
  } catch (error) {
    if (error instanceof WorkflowError) return errorState(error.message);
    console.error(error);
    return errorState("Something went wrong on our side. Please try again.");
  }
}
