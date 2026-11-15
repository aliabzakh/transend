/**
 * A thin bar that fills (cash paid today) or empties (the quote's countdown).
 * Always decoration beside words that give the same number.
 */
export function Meter({ value, max, countdown }: { value: number; max: number; countdown?: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const tone = countdown ? (pct <= 33 ? "high" : undefined) : pct >= 100 ? "full" : pct >= 80 ? "high" : undefined;
  return (
    <div className={`meter${countdown ? " countdown" : ""}`} aria-hidden>
      <div className="meter-fill" data-tone={tone} style={{ width: `${pct}%` }} />
    </div>
  );
}
