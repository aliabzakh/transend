import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type Base = { label: string; hint?: string };

/** Input with a visible label above it. */
export function Input({
  label,
  hint,
  mono,
  id,
  ...rest
}: Base & { mono?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <input id={fieldId} className={`input${mono ? " input-mono" : ""}`} {...rest} />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function Select({
  label,
  hint,
  id,
  children,
  ...rest
}: Base & { children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <select id={fieldId} className="input" {...rest}>
        {children}
      </select>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
