"use client";

import { RotateCcw, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { StatusLine } from "@/components/ui/StatusLine";
import { a } from "@/strings/admin.en";

/** The forecast could not be computed (database or service down). */
export default function CashError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Screen title={a.cash.title} wide>
      <div className="notice notice-error">
        <StatusLine icon={XCircle}>{a.cash.errorTitle}</StatusLine>
        <p className="small muted">{a.cash.errorLead}</p>
        <div>
          <Button variant="secondary" icon={RotateCcw} onClick={reset}>
            {a.cash.retry}
          </Button>
        </div>
      </div>
    </Screen>
  );
}
