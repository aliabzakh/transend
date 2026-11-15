"use client";

import { useState } from "react";
import { CheckCircle2, FileDown, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { downloadPdf } from "@/lib/client/api";

export default function AdminCardsPage() {
  const [n, setN] = useState("15");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const count = Math.min(30, Math.max(1, Math.floor(Number(n)) || 1));

  return (
    <Screen
      title="Demo cards"
      wide
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setMade(null);
        try {
          const res = await downloadPdf("/admin/api/cards", { n: count }, `transend-demo-cards-${count}.pdf`);
          setMade((res.headers.get("x-card-ids") ?? "").split(",").filter(Boolean));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not make the cards.");
        }
        setBusy(false);
      }}
      action={
        <Button type="submit" icon={FileDown} busy={busy}>
          {busy ? "Making cards on testnet..." : `Make ${count} cards and download the PDF`}
        </Button>
      }
    >
      <p className="muted">
        Makes a batch of real demo cards on testnet and downloads one print-ready PDF: one Letter sheet per card, front
        and back side by side. Cut on the corner marks and fold on the middle marks. The codes exist only in that PDF:
        we keep no copy, so print it or save it now. The contract allows 3 cards per sender, so the cards are spread over
        demo senders print-1@transend.demo, print-2@... (demo password). Log in as them to approve activation.
      </p>
      <Input
        label="How many cards"
        hint="Between 1 and 30. The demo uses 15. Takes about a minute."
        inputMode="numeric"
        value={n}
        onChange={(e) => setN(e.target.value)}
      />
      {error ? (
        <div className="notice notice-error">
          <StatusLine icon={XCircle}>{error}</StatusLine>
        </div>
      ) : null}
      {made ? (
        <>
          <StatusLine icon={CheckCircle2} tone="ok">{`${made.length} cards made. The PDF is downloading.`}</StatusLine>
          <ul className="list list-card">
            {made.map((id, i) => (
              <li key={id} className="list-item">
                <span className="mono">
                  {String(i + 1).padStart(2, "0")} {id}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Screen>
  );
}
