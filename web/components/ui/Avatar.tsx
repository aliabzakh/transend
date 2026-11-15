/** 40 px Gold circle with the person's initial: the person being paid. */
export function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="avatar" aria-hidden>
      {initial}
    </span>
  );
}
