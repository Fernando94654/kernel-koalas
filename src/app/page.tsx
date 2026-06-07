"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "~/trpc/react";
import { fmt, nivelEmoji, nivelColor } from "~/lib/ui";
import type { Nivel } from "~/lib/model";

type Linea = {
  nombre_sku: string;
  quantity: number;
  score_linea: number;
  nivel: Nivel;
  historico: boolean;
  sustitutos_probables: { nombre: string; frecuencia: number }[];
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-4 w-1 rounded-full bg-rojo" />
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
    </div>
  );
}

function ScoreHeader({ score, nivel }: { score: number; nivel: Nivel }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Riesgo del pedido
        </div>
        <div className={`text-3xl font-extrabold tracking-tight dot-${nivel}`}>
          {score.toFixed(4)}
        </div>
      </div>
      <span className={`badge badge-${nivel} px-3 py-1 text-sm`}>{nivel}</span>
    </div>
  );
}

function EarlyWarningBanner({ lineas }: { lineas: Linea[] }) {
  const atRisk = lineas.filter((l) => l.nivel !== "Verde");
  if (!atRisk.length) return null;
  return (
    <div
      className="my-3 rounded-xl px-4 py-3"
      style={{
        border: "1px solid rgba(245,166,35,0.35)",
        background: "rgba(245,166,35,0.06)",
      }}
    >
      <p className="mb-2 text-sm font-semibold" style={{ color: nivelColor.Amarillo }}>
        ⚠️ {atRisk.length} producto{atRisk.length > 1 ? "s" : ""} con probabilidad de cambio
      </p>
      <div className="space-y-1">
        {atRisk.map((l, i) => (
          <div key={i} className="text-[12px] text-ink">
            {nivelEmoji[l.nivel]} <strong>{l.nombre_sku}</strong>
            {l.sustitutos_probables[0] && (
              <span className="text-muted">
                {" "}→ posible reemplazo:{" "}
                <strong>{l.sustitutos_probables[0].nombre}</strong>{" "}
                <span className="opacity-60">
                  ({l.sustitutos_probables[0].frecuencia}×)
                </span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LineasList({ lineas }: { lineas: Linea[] }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      {lineas.map((l, i) => (
        <div key={i} className="border-b border-border px-3 py-3 last:border-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-ink">
              {nivelEmoji[l.nivel]} {l.nombre_sku}
              {!l.historico && (
                <span className="ml-1 text-[10px] text-muted">(sin historial)</span>
              )}
            </span>
            <span className="shrink-0 text-right text-sm">
              <span className="tabular-nums font-semibold">{l.score_linea.toFixed(4)}</span>
              <span className="block text-[11px] text-muted">×{l.quantity}</span>
            </span>
          </div>
          {l.sustitutos_probables.length > 0 && (
            <div className="mt-1 text-[11px] text-muted">
              Posible reemplazo:{" "}
              <span className="font-medium">{l.sustitutos_probables[0]!.nombre}</span>{" "}
              <span className="opacity-70">({l.sustitutos_probables[0]!.frecuencia}×)</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-0.5 font-semibold text-ink">{value}</div>
    </div>
  );
}

function SearchPicker({
  value,
  onChange,
  items,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  items: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = items
    .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 10);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        className="input w-full"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-y-auto rounded-xl border py-1"
          style={{
            background: "var(--color-card)",
            borderColor: "var(--color-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,.18)",
            maxHeight: 220,
          }}
        >
          {filtered.map((s) => (
            <li
              key={s}
              className="cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-surface"
              style={{ color: "var(--color-ink)" }}
              onMouseDown={() => { onChange(s); setOpen(false); }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PedidoPage() {
  const eda = api.eda.useQuery();
  const cat = eda.data?.catalogos;

  // ── Search existing order ──
  const [idInput, setIdInput] = useState("");
  const [queryId, setQueryId] = useState<string | null>(null);
  const pedido = api.pedido.useQuery({ id: queryId ?? "" }, { enabled: !!queryId });

  // ── Simulator ──
  const [cedis,  setCedis]  = useState("");
  const [sku,    setSku]    = useState("");
  const [qty,    setQty]    = useState(1);
  const [lineas, setLineas] = useState<{ nombre_sku: string; quantity: number }[]>([]);
  const simular = api.simular.useMutation();

  const cedisValid = cat?.cedis.includes(cedis) ?? false;

  const addLinea = () => {
    if (!sku.trim()) return;
    setLineas((prev) => [...prev, { nombre_sku: sku.trim(), quantity: qty || 1 }]);
    setSku("");
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">Revisar y Anticipar Pedidos</h1>
        <p className="mt-0.5 text-xs text-muted">
          Busca un pedido que ya realizaste o arma tu lista para ver si todos los productos te llegarán completos.
        </p>
      </div>

      {/* Desktop: side-by-side · Mobile: stacked */}
      <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start">

        {/* ── Search existing order ── */}
        <section className="card mb-4 md:mb-0">
          <SectionHeader title="Rastrear pedido existente" />

          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Ej. 8839440000000000000"
              value={idInput}
              inputMode="numeric"
              onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setQueryId(idInput.trim())}
            />
            <button className="btn shrink-0" onClick={() => setQueryId(idInput.trim())}>
              Buscar
            </button>
          </div>

          {queryId && pedido.isLoading && (
            <p className="mt-3 text-sm text-muted"><span className="spinner" /> Buscando…</p>
          )}
          {queryId && !pedido.isLoading && !pedido.data && (
            <p className="mt-3 text-sm text-rojo">No encontramos ese pedido. Verifica el número e intenta de nuevo.</p>
          )}

          {pedido.data && (
            <div className="mt-3">
              <ScoreHeader score={pedido.data.score_pedido} nivel={pedido.data.nivel_pedido} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Info label="Bodega"    value={pedido.data.cabecera.cedis} />
                <Info label="País"      value={pedido.data.cabecera.pais ?? "—"} />
                <Info label="Categoría" value={pedido.data.cabecera.business_unit ?? "—"} />
                <Info label="Estado"    value={pedido.data.cabecera.status_final ?? "—"} />
                <Info label="Líneas"    value={fmt(pedido.data.cabecera.n_lineas)} />
                <Info label="Total"     value={
                  pedido.data.cabecera.total
                    ? `$${fmt(Math.round(pedido.data.cabecera.total))}`
                    : "—"
                } />
              </div>
              {pedido.data.cabecera.nota_ambiguedad && (
                <div
                  className="mt-3 rounded-xl px-3 py-2.5 text-[11px]"
                  style={{
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-muted)",
                  }}
                >
                  ⚠️ {pedido.data.cabecera.nota_ambiguedad}
                </div>
              )}
              <EarlyWarningBanner lineas={pedido.data.lineas as Linea[]} />
              <LineasList lineas={pedido.data.lineas as Linea[]} />
            </div>
          )}
        </section>

        {/* ── Simulator ── */}
        <section className="card">
          <SectionHeader title="Armar nuevo pedido" />

          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Selecciona tu bodega
          </label>
          <SearchPicker
            value={cedis}
            onChange={setCedis}
            items={cat?.cedis ?? []}
            placeholder="Escribe el nombre o código de tu bodega…"
          />
          <p className="mb-3 mt-1 text-[10px] text-muted">
            Escribe para filtrar · selecciona de la lista para confirmar
          </p>

          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Añadir productos
          </label>
          <div className="flex gap-2">
            <SearchPicker
              value={sku}
              onChange={setSku}
              items={cat?.skus ?? []}
              placeholder="Escribe el nombre del producto…"
            />
            <input
              className="input !w-20"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
            />
            <button className="btn-ghost shrink-0 px-3" onClick={addLinea}>+</button>
          </div>

          {lineas.length > 0 && (
            <div className="mt-3 space-y-1">
              {lineas.map((l, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="min-w-0 break-words text-ink">
                    {l.nombre_sku}{" "}
                    <span className="text-muted">×{l.quantity}</span>
                  </span>
                  <button
                    className="ml-2 shrink-0 text-muted transition-colors hover:text-rojo"
                    onClick={() => setLineas((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              className="btn flex-1"
              disabled={!cedisValid || !lineas.length || simular.isPending}
              onClick={() => simular.mutate({ cedis, lineas })}
            >
              {simular.isPending ? "Calculando…" : "Verificar disponibilidad"}
            </button>
            <button
              className="btn-ghost"
              onClick={() => { setLineas([]); simular.reset(); }}
            >
              Limpiar lista
            </button>
          </div>
          {!cedisValid && cedis && (
            <p className="mt-1 text-[10px] text-rojo">Selecciona una bodega válida de la lista</p>
          )}

          {simular.data && (
            <div className="mt-4">
              <ScoreHeader score={simular.data.score_pedido} nivel={simular.data.nivel_pedido} />
              <p className="mt-2 text-[11px] text-muted">
                Bodega: {simular.data.cedis} · tasa de cambios: {(simular.data.tasa_cedis * 100).toFixed(1)}%
              </p>
              <EarlyWarningBanner lineas={simular.data.lineas as Linea[]} />
              <LineasList lineas={simular.data.lineas as Linea[]} />
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
