"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { demoCardIds } from "@/lib/demo/codes";

export default function AdminCardsPage() {
  const [n, setN] = useState("15");
  const count = Math.min(50, Math.max(1, Math.floor(Number(n)) || 1));
  const ids = demoCardIds(count);

  return (
    <Screen
      title="Demo cards"
      action={
        <Button href={`/admin/cards/print?n=${count}`} icon={FileDown}>
          Open print-ready sheet ({count})
        </Button>
      }
    >
      <p>
        Make a batch of demo cards for one demo sender. Open the sheet, then print it or save it as a PDF. Codes on the
        sheet are demo codes and match the shop demo.
      </p>
      <Input
        label="How many cards"
        hint="Between 1 and 50. The demo uses 15."
        inputMode="numeric"
        value={n}
        onChange={(e) => setN(e.target.value)}
      />
      <ul className="list">
        {ids.map((id, i) => (
          <li key={id} className="list-item">
            <span className="mono">
              {String(i + 1).padStart(2, "0")} {id}
            </span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
