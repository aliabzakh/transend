"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatusLine } from "@/components/ui/StatusLine";
import { apiGet, apiPost } from "@/lib/client/api";

type AreaStatus = "calm" | "tense" | "closed";
type Commune = { id: string; name: string; department: string; status: AreaStatus };
type Shop = { id: string; name: string; communeId: string; ceilingCad: number; hardCapCad: number };

export default function AdminAreasPage() {
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [areas, setAreas] = useState<Record<string, AreaStatus>>({});
  const [ceilings, setCeilings] = useState<Record<string, string>>({});
  const [caps, setCaps] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const load = async () => {
    const r = await apiGet<{ communes: Commune[]; shops: Shop[] }>("/admin/api/areas");
    setCommunes(r.communes);
    setShops(r.shops);
    setAreas(Object.fromEntries(r.communes.map((c) => [c.id, c.status])));
    setCeilings(Object.fromEntries(r.shops.map((s) => [s.id, String(s.ceilingCad)])));
    setCaps(Object.fromEntries(r.shops.map((s) => [s.id, String(s.hardCapCad)])));
  };
  useEffect(() => {
    load().catch(() => setState("error"));
  }, []);

  return (
    <Screen
      title="Areas and shops"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("saving");
        try {
          for (const c of communes) {
            if (areas[c.id] !== c.status) await apiPost("/admin/api/areas", { communeId: c.id, status: areas[c.id] });
          }
          for (const sh of shops) {
            await apiPost(`/admin/api/shops/${sh.id}`, {
              ceilingCad: Number(ceilings[sh.id]),
              hardCapCad: Number(caps[sh.id]),
            });
          }
          await load();
          setState("saved");
        } catch {
          setState("error");
        }
      }}
      action={
        <Button type="submit" icon={Save} disabled={state === "saving"}>
          Save
        </Button>
      }
    >
      <p>
        Set each area&apos;s risk level and each shop&apos;s daily cash ceiling. &quot;Tense&quot; drops the payout
        limit to US$50 at once; &quot;Closed&quot; stops payouts in that area. The forecast moves a ceiling only between
        C$150 and the hard cap.
      </p>
      <section className="stack">
        <h2 className="section-title">Area risk level</h2>
        {communes.map((c) => (
          <Select
            key={c.id}
            label={`${c.name} (${c.department})`}
            value={areas[c.id] ?? c.status}
            onChange={(e) => {
              setState("idle");
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
        {shops.map((sh) => (
          <div key={sh.id} className="stack">
            <Input
              label={`${sh.name} (${sh.id}): ceiling`}
              inputMode="numeric"
              value={ceilings[sh.id] ?? ""}
              onChange={(e) => {
                setState("idle");
                setCeilings({ ...ceilings, [sh.id]: e.target.value });
              }}
            />
            <Input
              label={`${sh.name}: hard cap`}
              inputMode="numeric"
              value={caps[sh.id] ?? ""}
              onChange={(e) => {
                setState("idle");
                setCaps({ ...caps, [sh.id]: e.target.value });
              }}
            />
          </div>
        ))}
      </section>
      {state === "saved" ? <StatusLine icon={CheckCircle2}>Saved.</StatusLine> : null}
      {state === "error" ? (
        <StatusLine icon={XCircle}>Could not save. A ceiling must be at least C$150 and not above its cap.</StatusLine>
      ) : null}
    </Screen>
  );
}
