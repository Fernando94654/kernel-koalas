"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { X } from "lucide-react";
import { nivelColor } from "~/lib/ui";
import type { Nivel } from "~/lib/model";

const GEO_URL = "/countries-110m.json";

// ISO 3166-1 numeric → country name used in our data
const ISO_TO_COUNTRY: Record<string, string> = {
  "32":  "Argentina",
  "218": "Ecuador",
  "484": "México",
  "604": "Perú",
};

const NIVEL_ORDER: Record<Nivel, number> = { Rojo: 2, Amarillo: 1, Verde: 0 };

interface SemaforoRow {
  cedis: string;
  nivel: Nivel;
  por_pais: Record<string, number>;
  tasa?: number;
}

interface CountryAgg {
  nivel: Nivel;
  counts: Record<Nivel, number>;
  tasa: number;
}

interface CedisMapProps {
  rows: SemaforoRow[];
  selectedPais: string;
  onSelect: (pais: string) => void;
  mode?: "pins" | "heat";
}

// Interpolate between green (0) → yellow (~10%) → red (>=20%) for continuous heat coloring.
function heatColor(tasa: number): string {
  const t = Math.min(1, Math.max(0, tasa / 0.2));
  if (t < 0.5) {
    // green → yellow
    const k = t / 0.5;
    const r = Math.round(34 + (245 - 34) * k);
    const g = Math.round(197 + (166 - 197) * k);
    const b = Math.round(94 + (35 - 94) * k);
    return `rgb(${r},${g},${b})`;
  }
  // yellow → red
  const k = (t - 0.5) / 0.5;
  const r = Math.round(245 + (220 - 245) * k);
  const g = Math.round(166 + (38 - 166) * k);
  const b = Math.round(35 + (38 - 35) * k);
  return `rgb(${r},${g},${b})`;
}

export function CedisMap({ rows, selectedPais, onSelect, mode = "pins" }: CedisMapProps) {
  const [tooltip, setTooltip] = useState<{ country: string; counts: Record<Nivel, number>; tasa: number } | null>(null);

  // Aggregate: determine primary country per CEDIS, then worst nivel per country
  const countryData: Record<string, CountryAgg> = {};
  for (const row of rows) {
    const entries = Object.entries(row.por_pais);
    if (!entries.length) continue;
    const primaryPais = entries.sort(([, a], [, b]) => b - a)[0]![0];

    if (!countryData[primaryPais]) {
      countryData[primaryPais] = { nivel: "Verde", counts: { Rojo: 0, Amarillo: 0, Verde: 0 }, tasa: 0 };
    }
    const cd = countryData[primaryPais]!;
    cd.counts[row.nivel]++;
    if (NIVEL_ORDER[row.nivel] > NIVEL_ORDER[cd.nivel]) {
      cd.nivel = row.nivel;
    }
    if (row.tasa !== undefined && row.tasa > cd.tasa) cd.tasa = row.tasa;
  }

  return (
    <div
      className="card mb-4 overflow-hidden !p-0"
      style={{ position: "relative" }}
    >
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ rotate: [80, 0, 0], scale: 160 }}
        style={{ width: "100%", height: "auto" }}
        height={280}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryId = String(geo.id ?? "");
              const country = ISO_TO_COUNTRY[countryId];
              const data = country ? countryData[country] : undefined;
              const isSelected = country === selectedPais;

              const baseFill = data
                ? mode === "heat"
                  ? heatColor(data.tasa)
                  : nivelColor[data.nivel]
                : "var(--color-border)";

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isSelected ? baseFill : data ? baseFill + "BB" : "var(--color-border)"}
                  stroke="var(--color-card)"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      outline: "none",
                      opacity: country ? 0.8 : 1,
                      cursor: country ? "pointer" : "default",
                    },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={() => {
                    if (country && data) setTooltip({ country, counts: data.counts, tasa: data.tasa });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => {
                    if (country) onSelect(selectedPais === country ? "" : country);
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute right-3 top-3 rounded-xl border px-3 py-2 text-[11px]"
          style={{
            background: "var(--color-card)",
            borderColor: "var(--color-border)",
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="font-semibold text-ink">{tooltip.country}</p>
          {mode === "heat" ? (
            <p className="text-muted">
              Tasa de cambios: <span className="font-semibold text-ink">{(tooltip.tasa * 100).toFixed(1)}%</span>
            </p>
          ) : (
            <p className="flex items-center gap-2 text-muted">
              <span className="flex items-center gap-1"><Dot c={nivelColor.Rojo} />{tooltip.counts.Rojo}</span>
              <span className="flex items-center gap-1"><Dot c={nivelColor.Amarillo} />{tooltip.counts.Amarillo}</span>
              <span className="flex items-center gap-1"><Dot c={nivelColor.Verde} />{tooltip.counts.Verde}</span>
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
        {mode === "heat" ? (
          <div
            className="flex items-center gap-2 rounded-lg border px-2 py-1 text-[10px] text-muted"
            style={{
              background: "var(--color-card)",
              borderColor: "var(--color-border)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="text-[10px]">0%</span>
            <span
              className="inline-block h-2 w-20 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, rgb(34,197,94), rgb(245,166,35), rgb(220,38,38))",
              }}
            />
            <span className="text-[10px]">20%+</span>
          </div>
        ) : (
          (["Rojo", "Amarillo", "Verde"] as Nivel[]).map((n) => (
            <div
              key={n}
              className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] text-muted"
              style={{
                background: "var(--color-card)",
                borderColor: "var(--color-border)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: nivelColor[n] }} />
              {n === "Rojo" ? "Alto riesgo" : n === "Amarillo" ? "Riesgo medio" : "Sin riesgo"}
            </div>
          ))
        )}
      </div>

      {/* Selected country badge */}
      {selectedPais && (
        <div className="absolute left-3 top-3">
          <button
            className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium text-ink"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
            onClick={() => onSelect("")}
          >
            {selectedPais} <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />;
}
