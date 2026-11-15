/** Large tabular figure with its currency code: 48 / 700, or 34 / 700 on a receipt. */
export function Amount({
  value,
  currency,
  small,
  center,
  reveal,
}: {
  value: number;
  currency: "USD" | "CAD";
  small?: boolean;
  /** Centre it, as on a receipt. */
  center?: boolean;
  /** A small pop as it lands (result screens). */
  reveal?: boolean;
}) {
  const code = currency === "USD" ? "US$" : "C$";
  const cls = `amount${small ? " amount-sm" : ""}${center ? " amount-center" : ""}${reveal ? " amount-reveal" : ""}`;
  return (
    <div className={cls}>
      <span className="amount-code">{code}</span>
      <span>{value.toFixed(2)}</span>
    </div>
  );
}
