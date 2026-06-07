"use client";

import { useState } from "react";
import {
  Package, Repeat, TrendingUp, Boxes, ArrowRight, X,
  AlertTriangle, BarChart3, CheckCircle2, ChevronRight,
} from "lucide-react";

import { api } from "~/trpc/react";
import { fmt, nivelColor } from "~/lib/ui";
import { CedisMap } from "~/components/CedisMap";
import { Donut } from "~/components/Charts";
import { ProductThumb } from "~/components/ProductThumb";
import type { Nivel } from "~/lib/model";

const ESTADO: Record<Nivel, string> = {
  Rojo: "Amenaza crítica de sustitución",
  Amarillo: "Nivel de riesgo moderado",
  Verde: "Riesgo bajo y estable",
};

function nivelDeTasa(tasa: number): Nivel {
  return tasa >= 0.14 ? "Rojo" : tasa >= 0.08 ? "Amarillo" : "Verde";
}

// Normaliza una tasa a porcentaje, tolere fracción (0-1) o ya-porcentaje.
const asPct = (x: number) => (x <= 1 ? x * 100 : x);

type Riesgo = { sku: string; tasa: number; n_lineas: number; n_sust: number };

export default function AlertasPage() {
  const eda = api.eda.useQuery();
  const [mapMode, setMapMode] = useState<"pins" | "heat">("pins");
  const [detalle, setDetalle] = useState<Riesgo | null>(null);

  const mapRows = eda.data
    ? Object.entries(eda.data.por_pais).map(([pais, data]) => ({
        cedis: `_pais_${pais}`,
        nivel: nivelDeTasa(data.tasa),
        por_pais: { [pais]: data.n_pedidos },
        tasa: data.tasa,
      }))
    : [];

  const m = eda.data?.metricas_globales;
  const topProductos = eda.data?.top_skus_por_tasa.slice(0, 12) ?? [];
  const topPares = eda.data?.top_pares.slice(0, 8) ?? [];
  const maxFrec = topPares.reduce((mx, p) => Math.max(mx, p.frecuencia), 0) || 1;

  // Donut de estados de pedido
  const statusData = (eda.data?.status_pedidos ?? []).slice(0, 5).map((s, i) => ({
    label: s.status,
    value: s.n,
    color: [nivelColor.Verde, nivelColor.Amarillo, nivelColor.Rojo, "#2563eb", "#9ca3af"][i],
  }));

  const sustitutosDe = (sku: string) =>
    (eda.data?.top_pares ?? []).filter((p) => p.origen === sku).slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Tendencias de Mercado</h1>
        <p className="mt-1 text-[13px] text-muted">
          Monitoreo de riesgos de sustitución por región y cambios en el comportamiento del consumidor.
        </p>
      </div>

      {/* KPIs */}
      {m && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<Package size={18} />} label="Pedidos analizados" value={fmt(m.total_pedidos)} />
          <Kpi icon={<Repeat size={18} />} label="Pedidos con algún cambio" value={`${asPct(m.pct_pedidos_con_sustitucion).toFixed(1)}%`} tone="rojo" />
          <Kpi icon={<TrendingUp size={18} />} label="Tasa de cambio (líneas)" value={`${asPct(m.tasa_sustitucion_lineas).toFixed(1)}%`} tone="amarillo" />
          <Kpi icon={<Boxes size={18} />} label="Productos vigilados" value={fmt(m.skus_unicos)} />
        </div>
      )}

      {/* Mapa */}
      {mapRows.length > 0 && (
        <div className="card mb-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="h-4 w-1 rounded-full bg-rojo" />
              Exposición de riesgo · Latinoamérica
            </h3>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2.5 font-mono text-[10px] text-muted sm:flex">
                <span className="flex items-center gap-1"><Dot c={nivelColor.Verde} />Bajo</span>
                <span className="flex items-center gap-1"><Dot c={nivelColor.Amarillo} />Medio</span>
                <span className="flex items-center gap-1"><Dot c={nivelColor.Rojo} />Alto</span>
              </div>
              <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-[11px]">
                {(["pins", "heat"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${mapMode === mode ? "text-ink" : "text-muted"}`}
                    style={mapMode === mode ? { background: "var(--color-surface)" } : undefined}
                    onClick={() => setMapMode(mode)}
                  >
                    {mode === "pins" ? "Categorías" : "Calor"}
                  </button>
                ))}
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

          {/* Riesgos de sustitución (clickeable) */}
          <section className="card">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="h-4 w-1 rounded-full bg-rojo" />
              Riesgos de Sustitución
            </h3>
            <p className="mb-4 pl-3 text-[11px] text-muted">Toca un producto para ver el detalle.</p>
            <div className="space-y-2.5">
              {topProductos.map((p) => {
                const nivel = nivelDeTasa(p.tasa);
                const color = nivelColor[nivel];
                const pctNum = asPct(p.tasa);
                return (
                  <button
                    key={p.sku}
                    onClick={() => setDetalle(p)}
                    className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-left transition-colors hover:border-rojo/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <ProductThumb nombre={p.sku} size={36} />
                      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{p.sku}</p>
                      <span className="shrink-0 font-display text-[17px] font-bold tabular-nums" style={{ color }}>
                        {pctNum.toFixed(0)}%
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-muted" />
                    </div>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-surface)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pctNum)}%`, background: color }} />
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium" style={{ color }}>
                      <EstadoIcon nivel={nivel} />
                      {ESTADO[nivel]}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="space-y-5">
            {/* Donut de estados */}
            {statusData.length > 0 && (
              <section className="card">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                  <BarChart3 size={16} className="text-rojo" />
                  Estado de los pedidos
                </h3>
                <Donut data={statusData} height={230} />
              </section>
            )}

            {/* Lógica de sustitución del consumidor */}
            <section className="card">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="h-4 w-1 rounded-full bg-rojo" />
                Lógica de Sustitución
              </h3>
              <p className="mb-4 pl-3 text-[11px] text-muted">Lo que más llega cuando falta el producto.</p>
              <div className="space-y-2.5">
                {topPares.map((par, i) => {
                  const match = Math.round((par.frecuencia / maxFrec) * 100);
                  return (
                    <div key={i} className="rounded-2xl border border-border bg-card px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                          <ProductThumb nombre={par.origen} size={40} />
                          <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink">{par.origen}</span>
                        </div>
                        <div className="flex shrink-0 flex-col items-center gap-1">
                          <span className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold" style={{ background: `${nivelColor.Amarillo}1F`, color: nivelColor.Amarillo }}>
                            {match}%
                          </span>
                          <ArrowRight size={16} style={{ color: nivelColor.Amarillo }} />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                          <ProductThumb nombre={par.destino} size={40} />
                          <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink">{par.destino}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Drawer de detalle */}
      {detalle && (
        <DetalleDrawer
          riesgo={detalle}
          sustitutos={sustitutosDe(detalle.sku)}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "rojo" | "amarillo" }) {
  const color = tone === "rojo" ? nivelColor.Rojo : tone === "amarillo" ? nivelColor.Amarillo : "var(--color-ink)";
  return (
    <div className="card !p-4">
      <div className="flex items-center gap-2 text-muted">
        <span style={{ color: tone ? color : undefined }}>{icon}</span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}

function EstadoIcon({ nivel }: { nivel: Nivel }) {
  if (nivel === "Rojo") return <AlertTriangle size={13} />;
  if (nivel === "Amarillo") return <TrendingUp size={13} />;
  return <CheckCircle2 size={13} />;
}

function DetalleDrawer({
  riesgo, sustitutos, onClose,
}: {
  riesgo: Riesgo;
  sustitutos: { origen: string; destino: string; frecuencia: number }[];
  onClose: () => void;
}) {
  const nivel = nivelDeTasa(riesgo.tasa);
  const color = nivelColor[nivel];
  const pctNum = asPct(riesgo.tasa);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-display text-lg font-bold text-ink">Detalle del producto</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-center gap-3">
            <ProductThumb nombre={riesgo.sku} size={64} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight text-ink">{riesgo.sku}</p>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold" style={{ background: `${color}1F`, color }}>
                <EstadoIcon nivel={nivel} /> {ESTADO[nivel]}
              </span>
            </div>
          </div>

          {/* Riesgo grande */}
          <div className="rounded-2xl border border-border bg-surface p-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Probabilidad de cambio</p>
            <p className="font-display text-5xl font-extrabold tabular-nums" style={{ color }}>{pctNum.toFixed(1)}%</p>
            <div className="mx-auto mt-3 h-2 max-w-[220px] overflow-hidden rounded-full bg-card">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, pctNum)}%`, background: color }} />
            </div>
          </div>

          {/* Volumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="font-display text-xl font-bold tabular-nums text-ink">{fmt(riesgo.n_lineas)}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Veces pedido</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="font-display text-xl font-bold tabular-nums" style={{ color }}>{fmt(riesgo.n_sust)}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Veces cambiado</p>
            </div>
          </div>

          {/* Sustitutos */}
          <div>
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
              Suele reemplazarse por
            </p>
            {sustitutos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted">
                Sin reemplazos frecuentes registrados.
              </p>
            ) : (
              <div className="space-y-2">
                {sustitutos.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2">
                    <ProductThumb nombre={s.destino} size={32} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{s.destino}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{s.frecuencia}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />;
}
