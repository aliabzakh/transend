/** A Gold speech bubble: a reply from the recipient ("From Odette · Received, thank you"). */
export function ReplyChip({ from, text }: { from: string; text: string }) {
  return (
    <div className="chip">
      <p className="chip-label">{from}</p>
      <p className="chip-text">{text}</p>
    </div>
  );
}
