"use client";

import { CircleAlert, LoaderCircle, Paperclip } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  startTransition,
  use,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { idleState, type FormState } from "@/lib/form-state";

/**
 * The form kit used by every form in the app.
 *
 * <ActionForm> connects a form to a server action with React's
 * `useActionState`. The fields below read the action's result from context,
 * so each one can show its own error without any wiring in the page.
 *
 * Accessibility built in here, once, for every form:
 *  - every input has a visible <label>
 *  - errors are linked to their input with aria-describedby
 *  - invalid inputs are marked aria-invalid
 *  - after a failed submit, focus moves to the first invalid input
 *  - the summary message is announced by screen readers (role="alert")
 */

type FormContextValue = { state: FormState; pending: boolean };

const FormContext = createContext<FormContextValue>({ state: idleState, pending: false });

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      // Submitting through onSubmit (instead of letting React run the action
      // itself) keeps what the user typed when the server reports an error.
      // Without JavaScript the plain `action` above still works.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      noValidate
      className={className}
    >
      <FormContext value={{ state, pending }}>{children}</FormContext>
    </form>
  );
}

function useFieldError(name: string): string | undefined {
  const { state } = use(FormContext);
  return state.fieldErrors?.[name]?.[0];
}

function describedBy(id: string, hint: unknown, error: unknown): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function FieldShell({
  id,
  label,
  hint,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-soft">(optional)</span>}
      </label>
      {hint && (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      )}
      {children}
      <FieldError id={id} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="field-error">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {error}
    </p>
  );
}

type SharedFieldProps = {
  name: string;
  /**
   * The HTML id. Defaults to `name`. Set it when two forms on one page have a
   * field with the same name, because ids must be unique within a page.
   */
  fieldId?: string;
  label: string;
  hint?: React.ReactNode;
  optional?: boolean;
};

export function TextField({
  name,
  fieldId,
  label,
  hint,
  optional,
  ...input
}: SharedFieldProps & Omit<React.ComponentProps<"input">, "name" | "id">) {
  const error = useFieldError(name);
  const id = fieldId ?? name;
  return (
    <FieldShell id={id} label={label} hint={hint} optional={optional} error={error}>
      <input
        id={id}
        name={name}
        className="field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        required={!optional}
        {...input}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  fieldId,
  label,
  hint,
  optional,
  ...textarea
}: SharedFieldProps & Omit<React.ComponentProps<"textarea">, "name" | "id">) {
  const error = useFieldError(name);
  const id = fieldId ?? name;
  return (
    <FieldShell id={id} label={label} hint={hint} optional={optional} error={error}>
      <textarea
        id={id}
        name={name}
        rows={4}
        className="field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        required={!optional}
        {...textarea}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  fieldId,
  label,
  hint,
  optional,
  placeholder,
  options,
  ...select
}: SharedFieldProps & {
  placeholder?: string;
  options: { value: string; label: string }[];
} & Omit<React.ComponentProps<"select">, "name" | "id">) {
  const error = useFieldError(name);
  const id = fieldId ?? name;
  return (
    <FieldShell id={id} label={label} hint={hint} optional={optional} error={error}>
      <select
        id={id}
        name={name}
        className="field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        required={!optional}
        // A controlled select passes `value`; otherwise start on the placeholder.
        defaultValue={select.value === undefined ? "" : undefined}
        {...select}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  fieldId,
  label,
  hint,
  ...input
}: {
  name: string;
  fieldId?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
} & Omit<React.ComponentProps<"input">, "name" | "id" | "type">) {
  const error = useFieldError(name);
  const id = fieldId ?? name;
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          className="mt-1 size-5 shrink-0 rounded-sm accent-brand-600"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...input}
        />
        <div>
          <label htmlFor={id} className="text-body font-bold text-ink">
            {label}
          </label>
          {hint && (
            <p id={`${id}-hint`} className="text-small text-ink-soft">
              {hint}
            </p>
          )}
        </div>
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
}

/** A file picker that lists what was chosen and previews a single image. */
export function FileField({
  name,
  fieldId,
  label,
  hint,
  optional,
  accept,
  multiple,
  preview,
}: SharedFieldProps & { accept: string; multiple?: boolean; preview?: boolean }) {
  const error = useFieldError(name);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object URLs must be released, or the browser keeps the image in memory.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const id = fieldId ?? name;
  return (
    <FieldShell id={id} label={label} hint={hint} optional={optional} error={error}>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className="field-input cursor-pointer p-1.5 file:mr-3 file:cursor-pointer file:rounded-sm file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-small file:font-bold file:text-white"
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? []);
          setFiles(chosen);
          const first = chosen[0];
          setPreviewUrl(
            preview && first && first.type.startsWith("image/") ? URL.createObjectURL(first) : null,
          );
        }}
      />
      {previewUrl && (
        // A local preview of the chosen file; next/image cannot optimise blob URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Preview of the photo you chose"
          className="mt-3 h-40 w-auto animate-rise rounded-md border border-line object-cover"
        />
      )}
      {!preview && files.length > 0 && (
        <ul className="mt-2 space-y-1 text-small text-ink-soft">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`} className="flex items-center gap-1.5">
              <Paperclip aria-hidden className="size-3.5" />
              {file.name}
            </li>
          ))}
        </ul>
      )}
    </FieldShell>
  );
}

/** The form-level result message. Field errors are shown under each field. */
export function FormStatus() {
  const { state } = use(FormContext);
  const visible = state.status === "error" && state.message;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.p
          key={state.message}
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <span className="flex items-start gap-2 rounded-md border border-danger-700 bg-danger-50 px-3 py-2.5 text-small font-bold text-danger-800">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.message}
          </span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = use(FormContext);
  return (
    // aria-disabled (not disabled) keeps the button focusable while it works.
    <button
      type="submit"
      className={className}
      aria-disabled={pending}
      onClick={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
