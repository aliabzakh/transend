import type { AreaStatus } from "@/lib/risk/network";

export type CashState = "ok" | "low" | "out" | "paused";

/** Cash on hand as a share of the day's ceiling. Colour is never the only signal: see CASH_LABEL. */
export function cashState(status: AreaStatus, frac: number): CashState {
  if (status === "closed") return "paused";
  if (frac < 0.1) return "out";
  if (frac < 0.35) return "low";
  return "ok";
}
export const CASH_LABEL: Record<CashState, string> = { ok: "Stocked", low: "Low", out: "Near empty", paused: "Paused" };

const usd0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export const usd = (n: number) => `US$${usd0.format(Math.round(n))}`;
export const usdK = (n: number) => (Math.abs(n) >= 10_000 ? `US$${(n / 1000).toFixed(1)}k` : usd(n));
export const pct = (n: number, d = 1) => `${n.toFixed(d)}%`;

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const dayShort = (iso: string) => {
  const d = dayDate(iso);
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()}`;
};
export const dayLong = (iso: string) => {
  const d = dayDate(iso);
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
};
export const clock = (hh: number, mm: number) => `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
