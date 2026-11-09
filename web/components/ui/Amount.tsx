/** Large tabular figure with its currency code. */
export function Amount({
  value,
  currency,
  small,
}: {
  value: number;
  currency: "USD" | "CAD";
  small?: boolean;
}) {
  const code = currency === "USD" ? "US$" : "C$";
  return (
    <div className={`amount${small ? " amount-sm" : ""}`}>
      <span className="amount-code">{code}</span>
      <span>{value.toFixed(2)}</span>
    </div>
  );
}
