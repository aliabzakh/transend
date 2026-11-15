import type { ComponentType, ReactNode } from "react";

/**
 * Icon plus words. Success and failure are never told apart by colour alone:
 * the tone only colours the icon (Leaf, Clay or Gold), the words carry the meaning.
 */
export function StatusLine({
  icon: Icon,
  tone,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: "ok" | "warn" | "info" | "muted";
  children: ReactNode;
}) {
  return (
    <div className={`status${tone ? ` status-${tone}` : ""}`} role="status">
      <Icon className="icon" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
