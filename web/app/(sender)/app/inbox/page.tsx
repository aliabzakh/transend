"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { getInbox, type InboxItem } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { explorerTxUrl } from "@/lib/config";
import { formatWhen } from "@/lib/format";
import { s } from "@/strings/sender.en";

export default function InboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getInbox()
        .then((r) => alive && setItems(r.inbox))
        .catch((e) => {
          if (e instanceof ApiError && e.status === 401) router.replace("/app/login");
        });
    load();
    const t = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [router]);

  return (
    <Screen title={s.inbox.title} back={{ href: "/app", label: s.back }}>
      <p className="muted">{s.inbox.lead}</p>
      {items === null ? <p className="muted">{s.loading}</p> : null}
      {items?.length === 0 ? <p>{s.inbox.empty}</p> : null}
      <ul className="list">
        {(items ?? []).map((m) => (
          <li key={m.id} className="list-item">
            <strong>{m.from}</strong>
            <span>{m.text}</span>
            <time className="muted small" suppressHydrationWarning>
              {formatWhen(m.at)}
            </time>
            {m.txHash ? (
              <a className="nav-link small" href={explorerTxUrl(m.txHash)} target="_blank" rel="noreferrer">
                <ExternalLink className="icon" aria-hidden />
                <span>{s.receipt}</span>
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </Screen>
  );
}
