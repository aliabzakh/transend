/** Draft A's hand-over icon: a phone with an arrow coming in. Drawn in Gold by the title style. */
export function HandOverIcon({ className }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M3 12h3M4.5 10.5 6 12l-1.5 1.5" />
    </svg>
  );
}
