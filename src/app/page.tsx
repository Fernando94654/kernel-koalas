"use client";

import { api } from "~/trpc/react";
import { Donut, HBar, VBar } from "~/components/Charts";
import { NetworkGraph } from "~/components/NetworkGraph";
import { COLORS, fmt, nivelColor, truncate } from "~/lib/ui";

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-rojo" />
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      {subtitle && (
        <p className="-mt-2 mb-2 pl-3 text-[11px] text-muted">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const eda = api.eda.useQuery();
  const grafo = api.grafo.useQuery();

  if (eda.isLoading) return <Loading />;
  if (eda.error ?? !eda.data) return <p className="text-sm text-rojo">No pudimos cargar la información. Por favor, recarga la página.</p>;

  const d = eda.data;
  const m = d.metricas_globales;

  const cards: { label: string; value: string; accent?: boolean }[] = [
    { label: "Pedidos",           value: fmt(m.total_pedidos) },
    { label: "Líneas",            value: fmt(m.total_lineas) },
    { label: "Cambios realizados", value: fmt(m.total_sustituciones), accent: true },
    { label: "Tasa de cambios",   value: m.tasa_sustitucion_lineas + "%" },
    { label: "Pedidos con cambios", value: m.pct_pedidos_con_sustitucion + "%" },
    { label: "Bodegas",           value: fmt(m.cedis_unicos) },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">Resumen General</h1>
        <p className="mt-0.5 text-xs text-muted">
          Monitorea qué tan probable es que tus pedidos lleguen completos desde las bodegas.
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {cards.map(({ label, value, accent }) => (
          <div
            key={label}
            className="card border-l-2 border-l-rojo !p-4"
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {label}
            </div>
            <div
              className="mt-1.5 text-2xl font-extrabold tracking-tight"
              style={{ color: accent ? "var(--rojo)" : "var(--color-ink)" }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Estado de pedidos">
          <Donut data={d.status_pedidos.map((s) => ({ label: `${s.status} (${s.pct}%)`, value: s.n }))} />
        </Panel>
        <Panel title="Pedidos por país">
          <VBar
            data={Object.entries(d.por_pais).map(([p, v]) => ({ label: p, value: v.n_pedidos }))}
            suffix=""
          />
        </Panel>
      </div>

      {/* Row 2 */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Top 10 productos más pedidos">
          <HBar
            data={d.top_skus.map((s) => ({ label: s.sku, value: s.n_lineas }))}
            color={COLORS.azul}
          />
        </Panel>
        <Panel title="Productos con más cambios">
          <HBar
            data={d.top_skus_por_tasa.slice(0, 10).map((s) => ({
              label: s.sku,
              value: +(s.tasa * 100).toFixed(2),
            }))}
            suffix="%" color={COLORS.amarillo}
          />
        </Panel>
      </div>

      {/* Full-width: CEDIS impact rate */}
      <Panel title="Bodegas con más cambios (top 15)" className="mb-4">
        <VBar
          data={d.top_cedis.slice(0, 15).map((c) => ({
            label: c.cedis,
            value: +(c.tasa_afectacion * 100).toFixed(1),
            color: nivelColor[c.nivel],
          }))}
          suffix="%" height={300}
        />
      </Panel>

      {/* Full-width: substitution pairs */}
      <Panel
        title="Top 10 cambios más frecuentes"
        subtitle="producto original → reemplazo (frecuencia)"
        className="mb-4"
      >
        <HBar
          data={d.top_pares.slice(0, 10).map((p) => ({
            label: `${truncate(p.origen, 10)} → ${truncate(p.destino, 16)}`,
            value: p.frecuencia,
          }))}
          color={COLORS.rojo}
        />
      </Panel>

      {/* Full-width: D3 substitution network */}
      <Panel
        title="Red de productos relacionados"
        subtitle="Los productos que más se sustituyen entre sí · arrastra para explorar"
      >
        {grafo.data ? (
          <NetworkGraph nodes={grafo.data.nodes} links={grafo.data.links} height={420} />
        ) : (
          <div className="skeleton h-56 animate-pulse" />
        )}
      </Panel>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-20 animate-pulse" />
        ))}
      </div>
      <div className="skeleton h-56 animate-pulse" />
      <div className="skeleton h-56 animate-pulse" />
    </div>
  );
}
