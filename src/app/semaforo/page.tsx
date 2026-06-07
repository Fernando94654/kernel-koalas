"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { nivelColor, nivelEmoji } from "~/lib/ui";
import { CedisMap } from "~/components/CedisMap";
import type { Nivel } from "~/lib/model";

function findSustituto(
  sku: string,
  pares: { origen: string; destino: string; frecuencia: number }[],
) {
  return pares.find((p) => p.origen === sku);
}

export default function AlertasPage() {
  const eda = api.eda.useQuery();
  const [mapMode, setMapMode] = useState<"pins" | "heat">("pins");

  // Derive map rows from per-country EDA substitution rates
  const mapRows = eda.data
    ? Object.entries(eda.data.por_pais).map(([pais, data]) => ({
        cedis: `_pais_${pais}`,
        nivel: (data.tasa >= 0.14 ? "Rojo" : data.tasa >= 0.08 ? "Amarillo" : "Verde") as Nivel,
        por_pais: { [pais]: data.n_pedidos },
        tasa: data.tasa,
      }))
    : [];

  const topProductos = eda.data?.top_skus_por_tasa.slice(0, 12) ?? [];
  const topPares = eda.data?.top_pares.slice(0, 8) ?? [];

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">Alertas de Mercado</h1>
        <p className="mt-0.5 text-xs text-muted">
          Aquí verás qué productos tienen mayor probabilidad de ser sustituidos en tu zona, y por cuál suelen reemplazarse.
        </p>
      </div>

      {/* Interactive map — country-level risk */}
      {mapRows.length > 0 && (
        <>
          <div className="mb-2 flex justify-end">
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
          <CedisMap rows={mapRows} selectedPais="" onSelect={() => {}} mode={mapMode} />
        </>
      )}

      {eda.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-14 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {eda.data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* ── Productos en alerta ── */}
          <section className="card">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-rojo" />
              <h3 className="text-sm font-semibold text-ink">Productos con mayor probabilidad de cambio</h3>
            </div>
            <div className="space-y-2">
              {topProductos.map((p) => {
                const nivel: Nivel =
                  p.tasa >= 0.14 ? "Rojo" : p.tasa >= 0.08 ? "Amarillo" : "Verde";
                const sust = findSustituto(p.sku, eda.data!.top_pares);
                return (
                  <div
                    key={p.sku}
                    className="rounded-xl border border-border bg-surface px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-medium leading-snug text-ink">
                        {nivelEmoji[nivel]} {p.sku}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                        style={{ background: nivelColor[nivel] }}
                      >
                        {(p.tasa * 100).toFixed(0)}%
                      </span>
                    </div>
                    {sust && (
                      <p className="mt-1 text-[11px] text-muted">
                        → suele reemplazarse por:{" "}
                        <span className="font-medium text-ink">{sust.destino}</span>{" "}
                        <span className="opacity-60">({sust.frecuencia} veces)</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Cambios más frecuentes ── */}
          <section className="card">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-rojo" />
              <h3 className="text-sm font-semibold text-ink">Cambios más frecuentes</h3>
            </div>
            <p className="-mt-2 mb-3 pl-3 text-[11px] text-muted">
              Producto original → el que más llega en su lugar
            </p>
            <div className="space-y-2">
              {topPares.map((par, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 text-[12px] text-ink">
                    <span className="font-medium">{par.origen}</span>
                    <span className="mx-1.5 text-muted">→</span>
                    <span className="font-medium" style={{ color: nivelColor.Amarillo }}>
                      {par.destino}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] tabular-nums text-muted">
                    {par.frecuencia}×
                  </span>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
