import type { ComponentType, ReactNode } from "react";

/** Icon plus words. Success and failure are never told apart by colour alone. */
export function StatusLine({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: ReactNode;
}) {
  return (
    <div className="status" role="status">
      <Icon className="icon" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
