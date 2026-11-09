"use client";

import { Printer } from "lucide-react";
import { Button } from "./ui/Button";

/** Opens the browser's print dialog, which can also save a PDF. */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <div className="no-print">
      <Button icon={Printer} onClick={() => window.print()}>
        {label}
      </Button>
    </div>
  );
}
