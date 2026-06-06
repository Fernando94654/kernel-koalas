"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import { fmt, nivelEmoji } from "~/lib/ui";
import type { Nivel } from "~/lib/model";

type Linea = {
  nombre_sku: string; quantity: number; score_linea: number; nivel: Nivel;
  historico: boolean; sustitutos_probables: { nombre: string; frecuencia: number }[];
};

function ScoreHeader({ score, nivel }: { score: number; nivel: Nivel }) {
  return (
    <div className="card flex items-center justify-between !py-3">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted">Score del pedido</div>
        <div className={`text-3xl font-extrabold dot-${nivel}`}>{score.toFixed(4)}</div>
      </div>
      <span className={`badge badge-${nivel} text-sm`}>{nivel}</span>
    </div>
  );
}

function LineasList({ lineas }: { lineas: Linea[] }) {
  return (
    <div className="card mt-3 !p-0 overflow-hidden">
      {lineas.map((l, i) => (
        <div key={i} className="border-b border-gray-100 px-3 py-2.5 last:border-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium">
              {nivelEmoji[l.nivel]} {l.nombre_sku}
              {!l.historico && <span className="ml-1 text-[10px] text-muted">(sin histórico)</span>}
            </span>
            <span className="shrink-0 text-right text-sm">
              <span className="tabular-nums font-semibold">{l.score_linea.toFixed(4)}</span>
              <span className="block text-[11px] text-muted">×{l.quantity}</span>
            </span>
          </div>
          {l.sustitutos_probables.length > 0 && (
            <div className="mt-1 text-[11px] text-muted">
              Sustituto probable: {l.sustitutos_probables[0]!.nombre}{" "}
              <span className="opacity-70">({l.sustitutos_probables[0]!.frecuencia}×)</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PedidoPage() {
  const eda = api.eda.useQuery();
  const cat = eda.data?.catalogos;

  // ---- buscar pedido existente ----
  const [idInput, setIdInput] = useState("");
  const [queryId, setQueryId] = useState<string | null>(null);
  const pedido = api.pedido.useQuery({ id: queryId ?? "" }, { enabled: !!queryId });

  // ---- simulador ----
  const [cedis, setCedis] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(12);
  const [lineas, setLineas] = useState<{ nombre_sku: string; quantity: number }[]>([]);
  const simular = api.simular.useMutation();

  const addLinea = () => {
    if (!sku.trim()) return;
    setLineas((p) => [...p, { nombre_sku: sku.trim(), quantity: qty || 1 }]);
    setSku("");
  };

  return (
    <div>
      <h1 className="mb-0.5 text-lg font-bold">Pedido & Simulador</h1>
      <p className="mb-3 text-xs text-muted">Consulta un pedido o simula uno nuevo.</p>

      {/* Buscar pedido */}
      <section className="card mb-4">
        <h3 className="mb-2 text-sm font-semibold">Buscar pedido existente</h3>
        <div className="flex gap-2">
          <input className="input" placeholder="ej. 8839440000000000000" value={idInput}
                 inputMode="numeric"
                 onChange={(e) => setIdInput(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && setQueryId(idInput.trim())} />
          <button className="btn shrink-0" onClick={() => setQueryId(idInput.trim())}>Buscar</button>
        </div>

        {queryId && pedido.isLoading && <p className="mt-3 text-sm text-muted"><span className="spinner" /> Buscando…</p>}
        {queryId && !pedido.isLoading && !pedido.data && <p className="mt-3 text-sm text-rojo">No se encontró el pedido.</p>}
        {pedido.data && (
          <div className="mt-3">
            <ScoreHeader score={pedido.data.score_pedido} nivel={pedido.data.nivel_pedido} />
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <Info label="CEDIS" value={pedido.data.cabecera.cedis} />
              <Info label="País" value={pedido.data.cabecera.pais ?? "—"} />
              <Info label="Unidad" value={pedido.data.cabecera.business_unit ?? "—"} />
              <Info label="Status" value={pedido.data.cabecera.status_final ?? "—"} />
              <Info label="Líneas" value={fmt(pedido.data.cabecera.n_lineas)} />
              <Info label="Total" value={pedido.data.cabecera.total ? `$${fmt(Math.round(pedido.data.cabecera.total))}` : "—"} />
            </div>
            {pedido.data.cabecera.nota_ambiguedad && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                ⚠️ {pedido.data.cabecera.nota_ambiguedad}
              </div>
            )}
            <LineasList lineas={pedido.data.lineas as Linea[]} />
          </div>
        )}
      </section>

      {/* Simulador */}
      <section className="card">
        <h3 className="mb-2 text-sm font-semibold">Simular pedido nuevo</h3>
        <label className="mb-1 block text-[11px] text-muted">CEDIS</label>
        <select className="input mb-2" value={cedis} onChange={(e) => setCedis(e.target.value)}>
          <option value="">Selecciona…</option>
          {cat?.cedis.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label className="mb-1 block text-[11px] text-muted">Agregar SKU</label>
        <div className="flex gap-2">
          <input className="input" list="skulist" placeholder="Buscar SKU…" value={sku}
                 onChange={(e) => setSku(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLinea()} />
          <input className="input !w-20" type="number" min={1} value={qty}
                 onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)} />
          <button className="btn-ghost shrink-0" onClick={addLinea}>+</button>
        </div>
        <datalist id="skulist">{cat?.skus.map((s) => <option key={s} value={s} />)}</datalist>

        {lineas.length > 0 && (
          <div className="mt-2 space-y-1">
            {lineas.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
                <span className="truncate">{l.nombre_sku} <span className="text-muted">×{l.quantity}</span></span>
                <button className="shrink-0 text-muted" onClick={() => setLineas((p) => p.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button className="btn flex-1" disabled={!cedis || !lineas.length || simular.isPending}
                  onClick={() => simular.mutate({ cedis, lineas })}>
            {simular.isPending ? "Calculando…" : "Calcular riesgo"}
          </button>
          <button className="btn-ghost" onClick={() => { setLineas([]); simular.reset(); }}>Vaciar</button>
        </div>

        {simular.data && (
          <div className="mt-3">
            <ScoreHeader score={simular.data.score_pedido} nivel={simular.data.nivel_pedido} />
            <p className="mt-1 text-[11px] text-muted">CEDIS {simular.data.cedis} · tasa {(simular.data.tasa_cedis * 100).toFixed(1)}%</p>
            <LineasList lineas={simular.data.lineas as Linea[]} />
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
