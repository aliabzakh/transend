export const usd = (n: number) => `US$${n.toFixed(2)}`;
export const cad = (n: number) => `C$${n.toFixed(2)}`;

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
