"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import { fmt, nivelEmoji } from "~/lib/ui";

export default function SemaforoPage() {
  const [pais, setPais] = useState("");
  const [bu, setBu]     = useState("");
  const [sel, setSel]   = useState<string | null>(null);

  const eda     = api.eda.useQuery();
  const sem     = api.semaforo.useQuery({ pais: pais || undefined, businessUnit: bu || undefined });
  const detalle = api.cedisDetalle.useQuery({ cedis: sel ?? "" }, { enabled: !!sel });

  const cat  = eda.data?.catalogos;
  const rows = sem.data?.cedis ?? [];

  // CEDIS detail panel — rendered in two places (left col on desktop, below table on mobile)
  const detailPanel = sel && (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-rojo" />
          <h3 className="text-sm font-semibold text-ink">CEDIS {sel}</h3>
        </div>
        {detalle.data && (
          <span className="badge badge-Rojo text-[10px]">
            {(detalle.data.tasa_afectacion * 100).toFixed(1)}% affected
          </span>
        )}
      </div>
      {detalle.isLoading && (
        <p className="text-sm text-muted"><span className="spinner" /> Loading…</p>
      )}
      <div className="space-y-2">
        {detalle.data?.skus.slice(0, 15).map((s) => (
          <div key={s.sku} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-ink">{nivelEmoji[s.nivel]} {s.sku}</span>
            <span className="shrink-0 tabular-nums font-medium text-muted">
              {s.score.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">CEDIS Traffic Light</h1>
        <p className="mt-0.5 text-xs text-muted">
          Distribution centers ranked by historical substitution impact rate.
        </p>
      </div>

      {/*
        Desktop: left col (filters + detail) | right col (table)
        Mobile:  filters → table → detail (stacked)
      */}
      <div className="md:grid md:grid-cols-[280px_1fr] md:gap-6 md:items-start">

        {/* ── Left column: filters + detail (desktop only) ── */}
        <div>
          <div className="card mb-3">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-rojo" />
              <h3 className="text-sm font-semibold text-ink">Filters</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Country
                </label>
                <select className="input" value={pais} onChange={(e) => setPais(e.target.value)}>
                  <option value="">All</option>
                  {cat?.paises.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Business unit
                </label>
                <select className="input" value={bu} onChange={(e) => setBu(e.target.value)}>
                  <option value="">All</option>
                  {cat?.business_units.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Detail visible in left col on desktop */}
          <div className="hidden md:block">{detailPanel}</div>
        </div>

        {/* ── Right column: table ── */}
        <div>
          <div className="card !p-0 overflow-hidden">
            <div
              className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <span>CEDIS</span>
              <span className="text-right">Orders</span>
              <span className="text-right">🔴/🟡</span>
              <span className="text-right">Rate</span>
            </div>

            {sem.isLoading && (
              <div className="p-4 text-sm text-muted"><span className="spinner" /> Loading…</div>
            )}
            {!sem.isLoading && rows.length === 0 && (
              <div className="p-4 text-sm text-muted">No CEDIS match those filters.</div>
            )}

            {rows.map((r) => {
              const isSelected = r.cedis === sel;
              return (
                <button
                  key={r.cedis}
                  onClick={() => setSel(isSelected ? null : r.cedis)}
                  className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-2 py-3 text-left text-sm transition-colors duration-100"
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    background: isSelected ? "var(--color-nav-active-bg)" : undefined,
                    borderLeft: isSelected ? "2px solid var(--rojo)" : "2px solid transparent",
                    paddingLeft: isSelected ? 10 : 12,
                    paddingRight: 12,
                    color: isSelected ? "var(--color-nav-active-text)" : "var(--color-ink)",
                  }}
                >
                  <span className="truncate font-medium">
                    {nivelEmoji[r.nivel]} {r.cedis}
                  </span>
                  <span className="text-right tabular-nums">{fmt(r.n_pedidos)}</span>
                  <span className="text-right tabular-nums text-xs text-muted">
                    {fmt(r.lineas_rojo)}/{fmt(r.lineas_amarillo)}
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {(r.tasa_afectacion * 100).toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detail visible below table on mobile */}
          {sel && <div className="mt-3 md:hidden">{detailPanel}</div>}
        </div>

      </div>
    </div>
  );
}
