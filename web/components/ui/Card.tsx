import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/** Canopy surface, 16 px radius and padding: the recipient row, quote, hand-over code and receipt. */
export function Card({
  children,
  href,
  variant,
  className,
  label,
}: {
  children: ReactNode;
  /** Makes the whole card a link, with a chevron and a press state. */
  href?: string;
  /** receipt: 18 px radius. row: one line, items side by side. tight: smaller padding. */
  variant?: "receipt" | "row" | "tight";
  className?: string;
  /** Accessible name when the card is a section on its own. */
  label?: string;
}) {
  const cls = `card${variant ? ` card-${variant}` : ""}${className ? ` ${className}` : ""}`;
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={label}>
        {children}
        <ChevronRight className="icon btn-chevron" aria-hidden />
      </Link>
    );
  }
  return (
    <section className={cls} aria-label={label}>
      {children}
    </section>
  );
}
