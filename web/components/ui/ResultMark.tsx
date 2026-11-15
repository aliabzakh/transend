/**
 * The 56 px outline mark on result screens. The circle draws itself, then the
 * tick (or cross) follows; a declined mark gives one small shake. It is
 * decoration: the words beside it always say what happened.
 */
export function ResultMark({ kind }: { kind: "ok" | "fail" | "wait" }) {
  return (
    <svg className={`mark mark-${kind}`} viewBox="0 0 48 48" aria-hidden>
      <circle className="mark-circle" cx="24" cy="24" r="21" />
      {kind === "ok" ? <path className="mark-tick" d="M15 24.5 21.5 31 33 18" /> : null}
      {kind === "fail" ? <path className="mark-tick" d="M17 17 31 31 M31 17 17 31" /> : null}
      {kind === "wait" ? <path className="mark-tick" d="M24 14 V24 L30 28" /> : null}
    </svg>
  );
}
