"use client";

import { useEffect, useRef } from "react";
import {
  Map as MlMap,
  Marker,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// MapLibre finds its worker next to its own module, which the bundler does not keep;
// point it at the bundled copy instead.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
import type { SimResult } from "@/lib/risk/simulate";
import type { OpsShop } from "@/lib/server/ops";
import { cashState, escapeHtml } from "./format";

const HAITI: [[number, number], [number, number]] = [
  [-74.55, 17.95],
  [-71.6, 20.12],
];

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
    places: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
    },
    dem: {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 14,
      attribution: "Terrain: Mapzen, AWS Open Data",
    },
  },
  layers: [
    { id: "imagery", type: "raster", source: "imagery", paint: { "raster-saturation": -0.2, "raster-brightness-max": 0.82, "raster-contrast": 0.08 } },
    { id: "places", type: "raster", source: "places", paint: { "raster-opacity": 0.55 } },
  ],
  terrain: { source: "dem", exaggeration: 1.4 },
  sky: {
    "sky-color": "#0B1A13",
    "horizon-color": "#1B3A2A",
    "fog-color": "#0B1A13",
    "sky-horizon-blend": 0.6,
    "horizon-fog-blend": 0.6,
    "fog-ground-blend": 0.7,
    "atmosphere-blend": 0.4,
  },
};

type Props = {
  shops: OpsShop[];
  sim: SimResult;
  step: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function OpsMap({ shops, sim, step, selectedId, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const whenReady = useRef<(() => void)[]>([]);
  const onReady = (fn: () => void) => (ready.current ? fn() : whenReady.current.push(fn));
  const pins = useRef(new Map<string, { marker: Marker; el: HTMLDivElement }>());
  const lastStep = useRef(0);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    if (!box.current) return;
    const m = new MlMap({
      container: box.current,
      style: STYLE,
      bounds: HAITI,
      fitBoundsOptions: { padding: 40 },
      pitch: 38,
      maxPitch: 75,
      attributionControl: { compact: true },
    });
    map.current = m;
    m.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    m.addControl(new ScaleControl({ unit: "metric" }), "bottom-right");

    m.on("load", () => {
      // Start with the attribution folded to its (i) button; it opens on click.
      box.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      for (const s of shops) {
        const el = document.createElement("div");
        el.className = "ops-pin";
        el.dataset.real = s.simulated ? "0" : "1";
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `${s.name}, ${s.commune}`);
        el.innerHTML = `<span class="ops-pin-ring"></span><span class="ops-pin-dot"></span><span class="ops-pin-label">${escapeHtml(
          s.name,
        )}${s.simulated ? "" : ` · ${escapeHtml(s.id)}`}</span>`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current(s.id);
        });
        const marker = new Marker({ element: el, anchor: "center" }).setLngLat([s.lng, s.lat]).addTo(m);
        pins.current.set(s.id, { marker, el });
      }
      const zoomClass = () => box.current?.classList.toggle("ops-map-near", m.getZoom() >= 9.2);
      m.on("zoom", zoomClass);
      zoomClass();
      ready.current = true;
      whenReady.current.splice(0).forEach((fn) => fn());
    });
    return () => {
      ready.current = false;
      whenReady.current = [];
      pins.current.clear();
      m.remove();
      map.current = null;
    };
    // The shop list is fixed for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update pins for the playhead: cash ring, and the shopkeeper's own top-ups.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      const s = Math.min(sim.steps - 1, Math.floor(step));
      const byId = new Map(sim.shops.map((x) => [x.id, x]));
      for (const shop of shops) {
        const pin = pins.current.get(shop.id);
        const ss = byId.get(shop.id);
        if (!pin || !ss) continue;
        const frac = ss.ceiling[s] > 0 ? ss.cash[s] / ss.ceiling[s] : 0;
        pin.el.style.setProperty("--f", String(Math.max(0, Math.min(1, frac))));
        pin.el.dataset.state = cashState(shop.status, frac);
        pin.el.dataset.selected = shop.id === selectedId ? "1" : "0";
      }
      // A top-up in progress shows a gold outline; one that just finished (while playing
      // forward) sends a single gold pulse from the pin.
      const active = new Set<string>();
      const pulse = new Set<string>();
      for (const t of sim.topUps) {
        if (t.startStep > step) break;
        if (t.endStep > step) active.add(t.shopId);
        if (t.endStep > lastStep.current && t.endStep <= step && step - lastStep.current < 8) pulse.add(t.shopId);
      }
      lastStep.current = step;
      for (const shop of shops) {
        const pin = pins.current.get(shop.id);
        if (!pin) continue;
        pin.el.dataset.topup = active.has(shop.id) ? "1" : "0";
        if (pulse.has(shop.id)) {
          const ring = document.createElement("span");
          ring.className = "ops-pulse";
          ring.addEventListener("animationend", () => ring.remove());
          pin.el.appendChild(ring);
        }
      }
    };
    onReady(apply);
  }, [step, sim, shops, selectedId]);

  // Fly to the selected shop, or back to the whole country.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const fly = () => {
      const s = shops.find((x) => x.id === selectedId);
      if (s) m.flyTo({ center: [s.lng, s.lat], zoom: 14.2, pitch: 60, bearing: -18, duration: 2600, essential: true });
      else m.fitBounds(HAITI, { padding: 40, pitch: 38, bearing: 0, duration: 2000 });
    };
    onReady(fly);
  }, [selectedId, shops]);

  return <div ref={box} className="ops-map" aria-label="Satellite map of the shop network" />;
}
