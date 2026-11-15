"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { ReplyChip } from "@/components/ui/ReplyChip";
import { Skeleton } from "@/components/ui/Skeleton";
import { getInbox, type InboxItem } from "@/lib/client/sender";
import { ApiError } from "@/lib/client/api";
import { explorerTxUrl } from "@/lib/config";
import { formatWhen } from "@/lib/format";
import { s } from "@/strings/sender.en";

const first = (name: string) => name.trim().split(/\s+/)[0] || name;

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
      {items === null ? (
        <div className="stack">
          <Skeleton label={s.loading} />
          <Skeleton />
        </div>
      ) : null}
      {items?.length === 0 ? <p className="muted">{s.inbox.empty}</p> : null}
      <ul className="feed">
        {(items ?? []).map((m) => (
          <li key={m.id}>
            {/* Replies from the recipient are Gold, like the draft's "From Mama" bubble. */}
            {m.kind === "reply" ? (
              <ReplyChip from={s.inbox.replyFrom(first(m.from))} text={m.text} />
            ) : (
              <div className="bubble">
                <p className="small muted">{m.from}</p>
                <p>{m.text}</p>
              </div>
            )}
            <div className="feed-meta">
              <time suppressHydrationWarning>{formatWhen(m.at)}</time>
              {m.txHash ? (
                <a href={explorerTxUrl(m.txHash)} target="_blank" rel="noreferrer">
                  <ExternalLink className="icon" aria-hidden />
                  <span>{s.receipt}</span>
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
