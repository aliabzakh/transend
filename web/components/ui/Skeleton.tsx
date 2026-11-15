/** A flat placeholder that breathes while data loads. Pair it with a visually hidden "Loading..." */
export function Skeleton({ kind, label }: { kind?: "line" | "tall"; label?: string }) {
  return (
    <div className={`skeleton${kind ? ` skeleton-${kind}` : ""}`} role={label ? "status" : undefined}>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}
