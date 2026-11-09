"use client";

import { Screen } from "@/components/ui/Screen";
import { useSender } from "@/lib/demo/sender-store";
import { formatWhen } from "@/lib/format";
import { s } from "@/strings/sender.en";

export default function InboxPage() {
  const st = useSender();
  return (
    <Screen title={s.inbox.title} back={{ href: "/app", label: s.back }}>
      <p className="muted">{s.inbox.lead}</p>
      {st.inbox.length === 0 ? <p>{s.inbox.empty}</p> : null}
      <ul className="list">
        {st.inbox.map((m) => (
          <li key={m.id} className="list-item">
            <strong>{m.from}</strong>
            <span>{m.text}</span>
            <time className="muted small" suppressHydrationWarning>
              {formatWhen(m.at)}
            </time>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
