"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiPost } from "@/lib/client/api";
import { a } from "@/strings/admin.en";

/** Runs the nightly forecast job now and reloads the dashboard. */
export function RecomputeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      icon={RefreshCw}
      busy={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await apiPost("/admin/api/forecast/recompute");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? a.cash.recomputing : a.cash.recompute}
    </Button>
  );
}
