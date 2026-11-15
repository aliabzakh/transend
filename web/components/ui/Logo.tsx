import { common } from "@/strings/common";

/**
 * The Held mark (one figure with raised arms around a gold coin) beside the
 * wordmark. Geometry matches docs/brand/transend-mark.svg; colours and size
 * come from the --logo-* tokens.
 */
export function Logo({
  wordmark = common.brand,
  markOnly = false,
}: {
  wordmark?: string;
  markOnly?: boolean;
}) {
  const mark = (
    <svg
      className="logo-mark"
      viewBox="0 0 96 96"
      {...(markOnly ? { role: "img", "aria-label": common.brand } : { "aria-hidden": true })}
    >
      <circle cx="48" cy="27" r="15" className="logo-coin" />
      <path d="M16 44 Q48 104 80 44" className="logo-arms" strokeWidth="14" strokeLinecap="round" />
    </svg>
  );
  if (markOnly) return mark;
  return (
    <span className="logo">
      {mark}
      <span className="logo-word">{wordmark}</span>
    </span>
  );
}
