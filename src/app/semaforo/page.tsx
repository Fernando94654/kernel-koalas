"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { nivelColor } from "~/lib/ui";
import { CedisMap } from "~/components/CedisMap";
import { ProductThumb } from "~/components/ProductThumb";
import type { Nivel } from "~/lib/model";

const ESTADO: Record<Nivel, string> = {
  Rojo: "Amenaza crítica de sustitución",
  Amarillo: "Nivel de riesgo moderado",
  Verde: "Riesgo bajo y estable",
};

const ESTADO_ICON: Record<Nivel, string> = {
  Rojo: "↗",
  Amarillo: "▤",
  Verde: "✓",
};

function nivelDeTasa(tasa: number): Nivel {
  return tasa >= 0.14 ? "Rojo" : tasa >= 0.08 ? "Amarillo" : "Verde";
}

export default function AlertasPage() {
  const eda = api.eda.useQuery();
  const [mapMode, setMapMode] = useState<"pins" | "heat">("pins");

  // Derive map rows from per-country EDA substitution rates
  const mapRows = eda.data
    ? Object.entries(eda.data.por_pais).map(([pais, data]) => ({
        cedis: `_pais_${pais}`,
        nivel: nivelDeTasa(data.tasa),
        por_pais: { [pais]: data.n_pedidos },
        tasa: data.tasa,
      }))
    : [];

  const topProductos = eda.data?.top_skus_por_tasa.slice(0, 12) ?? [];
  const topPares = eda.data?.top_pares.slice(0, 8) ?? [];
  const maxFrec = topPares.reduce((m, p) => Math.max(m, p.frecuencia), 0) || 1;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page header — "Market trends" */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Tendencias de Mercado</h1>
        <p className="mt-1 text-[13px] text-muted">
          Monitoreo de riesgos de sustitución por región y cambios en el comportamiento del consumidor.
        </p>
      </div>

      {/* Risk exposure map */}
      {mapRows.length > 0 && (
        <div className="card mb-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-rojo" />
              <h3 className="text-sm font-semibold text-ink">Exposición de riesgo · Latinoamérica</h3>
            </div>
            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="hidden items-center gap-2.5 font-mono text-[10px] text-muted sm:flex">
                <span className="flex items-center gap-1"><Dot c={nivelColor.Verde} />Bajo</span>
                <span className="flex items-center gap-1"><Dot c={nivelColor.Amarillo} />Medio</span>
                <span className="flex items-center gap-1"><Dot c={nivelColor.Rojo} />Alto</span>
              </div>
              <div
                className="inline-flex rounded-lg border p-0.5 text-[11px]"
                style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
              >
                <button
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${mapMode === "pins" ? "text-ink" : "text-muted"}`}
                  style={mapMode === "pins" ? { background: "var(--color-surface)" } : undefined}
                  onClick={() => setMapMode("pins")}
                >
                  Categorías
                </button>
                <button
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${mapMode === "heat" ? "text-ink" : "text-muted"}`}
                  style={mapMode === "heat" ? { background: "var(--color-surface)" } : undefined}
                  onClick={() => setMapMode("heat")}
                >
                  Calor
                </button>
              </div>
            </div>
          </div>
          <CedisMap rows={mapRows} selectedPais="" onSelect={() => {}} mode={mapMode} />
        </div>
      )}

      {eda.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {eda.data && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* ── Riesgos de sustitución ── */}
          <section className="card">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-rojo" />
              <h3 className="text-sm font-semibold text-ink">Riesgos de Sustitución</h3>
            </div>
            <div className="space-y-2.5">
              {topProductos.map((p) => {
                const nivel = nivelDeTasa(p.tasa);
                const color = nivelColor[nivel];
                const pctNum = p.tasa * 100;
                return (
                  <div
                    key={p.sku}
                    className="rounded-2xl border border-border bg-card px-3 py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <ProductThumb nombre={p.sku} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                          {p.sku}
                        </p>
                      </div>
                      <span className="shrink-0 text-[17px] font-extrabold tabular-nums" style={{ color }}>
                        {pctNum.toFixed(0)}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-surface)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, pctNum)}%`, background: color }}
                      />
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color }}>
                      <span className="font-mono">{ESTADO_ICON[nivel]}</span>
                      <span className="font-medium">{ESTADO[nivel]}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Lógica de sustitución del consumidor ── */}
          <section className="card">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-rojo" />
              <h3 className="text-sm font-semibold text-ink">Lógica de Sustitución del Consumidor</h3>
            </div>
            <p className="mb-4 pl-3 text-[11px] text-muted">
              Cuando falta el producto, esto es lo que más llega en su lugar.
            </p>
            <div className="space-y-2.5">
              {topPares.map((par, i) => {
                const match = Math.round((par.frecuencia / maxFrec) * 100);
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-card px-3 py-3"
                  >
                    <div className="flex items-center gap-2">
                      {/* Origen */}
                      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                        <ProductThumb nombre={par.origen} size={44} />
                        <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink">
                          {par.origen}
                        </span>
                      </div>

                      {/* Match badge + arrow */}
                      <div className="flex shrink-0 flex-col items-center gap-1">
                        <span
                          className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
                          style={{ background: `${nivelColor.Amarillo}1F`, color: nivelColor.Amarillo }}
                        >
                          {match}% afín
                        </span>
                        <span className="text-base font-bold" style={{ color: nivelColor.Amarillo }}>→</span>
                        <span className="font-mono text-[9px] text-muted">{par.frecuencia}×</span>
                      </div>

                      {/* Destino */}
                      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                        <ProductThumb nombre={par.destino} size={44} />
                        <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink">
                          {par.destino}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />;
}
