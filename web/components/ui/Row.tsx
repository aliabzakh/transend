import type { ReactNode } from "react";

/** Label on the left (muted), value on the right (500, tabular). Used for quotes and receipts. */
export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <span className="row-value">{value}</span>
    </div>
  );
}

/** A Canopy card of rows, 12 px apart. `plain` drops the card when it already sits in one. */
export function Rows({ children, plain }: { children: ReactNode; plain?: boolean }) {
  return <div className={`rows${plain ? " rows-plain" : ""}`}>{children}</div>;
}
