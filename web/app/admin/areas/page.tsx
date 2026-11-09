"use client";

import { useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatusLine } from "@/components/ui/StatusLine";
import { COMMUNES, SHOPS, type AreaStatus } from "@/lib/demo/areas";

export default function AdminAreasPage() {
  const [areas, setAreas] = useState<Record<string, AreaStatus>>(
    Object.fromEntries(COMMUNES.map((c) => [c.id, "calm" as AreaStatus])),
  );
  const [ceilings, setCeilings] = useState<Record<string, string>>(
    Object.fromEntries(SHOPS.map((s) => [s.id, String(s.ceilingCad)])),
  );
  const [saved, setSaved] = useState(false);

  return (
    <Screen
      title="Areas and shops"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(true);
      }}
      action={
        <Button type="submit" icon={Save}>
          Save
        </Button>
      }
    >
      <p>Set each area&apos;s risk level and each shop&apos;s daily cash ceiling. This is demo data and is not stored yet.</p>
      <section className="stack">
        <h2 className="section-title">Area risk level</h2>
        {COMMUNES.map((c) => (
          <Select
            key={c.id}
            label={`${c.name} (${c.department})`}
            value={areas[c.id]}
            onChange={(e) => {
              setSaved(false);
              setAreas({ ...areas, [c.id]: e.target.value as AreaStatus });
            }}
          >
            <option value="calm">Calm</option>
            <option value="tense">Tense: limit US$50</option>
            <option value="closed">Closed: no payouts</option>
          </Select>
        ))}
      </section>
      <section className="stack">
        <h2 className="section-title">Shop cash ceiling (C$ a day)</h2>
        {SHOPS.map((sh) => (
          <Input
            key={sh.id}
            label={`${sh.name} (${sh.id})`}
            inputMode="numeric"
            value={ceilings[sh.id]}
            onChange={(e) => {
              setSaved(false);
              setCeilings({ ...ceilings, [sh.id]: e.target.value });
            }}
          />
        ))}
      </section>
      {saved ? <StatusLine icon={CheckCircle2}>Saved for this demo.</StatusLine> : null}
    </Screen>
  );
}
