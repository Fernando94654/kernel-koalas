"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import { fmt, nivelEmoji } from "~/lib/ui";

export default function SemaforoPage() {
  const [pais, setPais] = useState("");
  const [bu, setBu] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const eda = api.eda.useQuery();
  const sem = api.semaforo.useQuery({ pais: pais || undefined, businessUnit: bu || undefined });
  const detalle = api.cedisDetalle.useQuery({ cedis: sel ?? "" }, { enabled: !!sel });

  const cat = eda.data?.catalogos;
  const rows = sem.data?.cedis ?? [];

  return (
    <div>
      <h1 className="mb-0.5 text-lg font-bold">Semáforo de CEDIS</h1>
      <p className="mb-3 text-xs text-muted">Centros ordenados por tasa de afectación histórica.</p>

      <div className="card mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-muted">País</label>
          <select className="input" value={pais} onChange={(e) => setPais(e.target.value)}>
            <option value="">Todos</option>
            {cat?.paises.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted">Unidad de negocio</label>
          <select className="input" value={bu} onChange={(e) => setBu(e.target.value)}>
            <option value="">Todas</option>
            {cat?.business_units.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-gray-200 px-3 py-2 text-[10px] font-semibold uppercase text-muted">
          <span>CEDIS</span><span className="text-right">Pedidos</span><span className="text-right">🔴/🟡</span><span className="text-right">Tasa</span>
        </div>
        {sem.isLoading && <div className="p-4 text-sm text-muted"><span className="spinner" /> Cargando…</div>}
        {!sem.isLoading && rows.length === 0 && <div className="p-4 text-sm text-muted">Sin CEDIS para ese filtro.</div>}
        {rows.map((r) => (
          <button key={r.cedis} onClick={() => setSel(r.cedis === sel ? null : r.cedis)}
            className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-left text-sm active:bg-gray-50">
            <span className="font-semibold">
              {nivelEmoji[r.nivel]} {r.cedis}
            </span>
            <span className="text-right tabular-nums">{fmt(r.n_pedidos)}</span>
            <span className="text-right tabular-nums text-xs">{fmt(r.lineas_rojo)}/{fmt(r.lineas_amarillo)}</span>
            <span className="text-right font-semibold tabular-nums">{(r.tasa_afectacion * 100).toFixed(1)}%</span>
          </button>
        ))}
      </div>

      {sel && (
        <div className="card mt-3">
          <h3 className="mb-2 text-sm font-semibold">
            CEDIS {sel} · SKUs de mayor riesgo
            {detalle.data && <span className="ml-1 font-normal text-muted">· afectación {(detalle.data.tasa_afectacion * 100).toFixed(1)}%</span>}
          </h3>
          {detalle.isLoading && <p className="text-sm text-muted"><span className="spinner" /> Cargando…</p>}
          <div className="space-y-1.5">
            {detalle.data?.skus.slice(0, 15).map((s) => (
              <div key={s.sku} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{nivelEmoji[s.nivel]} {s.sku}</span>
                <span className="shrink-0 tabular-nums text-muted">{s.score.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
