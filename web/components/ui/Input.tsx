import { ChevronDown, CircleAlert } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type Base = { label: string; hint?: string; /** Shown under the field with an icon; marks it invalid. */ error?: string };

const idFor = (label: string, id?: string) => id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;

function Help({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint ? (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="field-error" id={`${id}-err`} role="alert">
          <CircleAlert className="icon" aria-hidden />
          {error}
        </span>
      ) : null}
    </>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;

/** Input with a visible label above it. Canopy fill; a Leaf edge on focus. */
export function Input({
  label,
  hint,
  error,
  mono,
  id,
  ...rest
}: Base & { mono?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = idFor(label, id);
  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        id={fieldId}
        className={`input${mono ? " input-mono" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        {...rest}
      />
      <Help id={fieldId} hint={hint} error={error} />
    </div>
  );
}

/** The big "You send C$200.00" entry: a display-size figure with its currency code. */
export function AmountInput({
  label,
  hint,
  error,
  prefix,
  id,
  ...rest
}: Base & { prefix: string } & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = idFor(label, id);
  return (
    <div className="field center">
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <div className="input-amount-wrap">
        <span className="input-amount-prefix" aria-hidden>
          {prefix}
        </span>
        <input
          id={fieldId}
          className="input-amount"
          // Size the field to its digits so the figure stays centred beside its code.
          style={{ width: `${Math.max(2, String(rest.value ?? "").length) + 0.5}ch` }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          {...rest}
        />
      </div>
      <Help id={fieldId} hint={hint} error={error} />
    </div>
  );
}

export function Select({
  label,
  hint,
  error,
  id,
  children,
  ...rest
}: Base & { children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = idFor(label, id);
  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <div className="select-wrap">
        <select
          id={fieldId}
          className="input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="icon" aria-hidden />
      </div>
      <Help id={fieldId} hint={hint} error={error} />
    </div>
  );
}
