"use client";

import { api } from "~/trpc/react";
import { Donut, HBar, VBar } from "~/components/Charts";
import { NetworkGraph } from "~/components/NetworkGraph";
import { COLORS, fmt, nivelColor, truncate } from "~/lib/ui";

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card mb-3">
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {subtitle && <p className="mb-2 -mt-0.5 text-[11px] text-muted">{subtitle}</p>}
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const eda = api.eda.useQuery();
  const grafo = api.grafo.useQuery();

  if (eda.isLoading) return <Loading />;
  if (eda.error || !eda.data) return <p className="text-sm text-rojo">Error cargando datos.</p>;

  const d = eda.data;
  const m = d.metricas_globales;
  const cards: [string, string][] = [
    ["Pedidos", fmt(m.total_pedidos)],
    ["Líneas", fmt(m.total_lineas)],
    ["Sustituciones", fmt(m.total_sustituciones)],
    ["Tasa sustitución", m.tasa_sustitucion_lineas + "%"],
    ["Pedidos afectados", m.pct_pedidos_con_sustitucion + "%"],
    ["CEDIS", fmt(m.cedis_unicos)],
  ];

  return (
    <div>
      <h1 className="mb-0.5 text-lg font-bold">Dashboard</h1>
      <p className="mb-3 text-xs text-muted">Riesgo de sustitución antes de que el pedido salga del CEDIS.</p>

      <div className="mb-3 grid grid-cols-2 gap-2.5">
        {cards.map(([l, v]) => (
          <div key={l} className="card !p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted">{l}</div>
            <div className="mt-1 text-2xl font-extrabold">{v}</div>
          </div>
        ))}
      </div>

      <Panel title="Status de pedidos">
        <Donut data={d.status_pedidos.map((s) => ({ label: `${s.status} (${s.pct}%)`, value: s.n }))} />
      </Panel>

      <Panel title="Pedidos por país">
        <VBar data={Object.entries(d.por_pais).map(([p, v]) => ({ label: p, value: v.n_pedidos }))} suffix="" />
      </Panel>

      <Panel title="Top 10 SKUs más pedidos">
        <HBar data={d.top_skus.map((s) => ({ label: s.sku, value: s.n_lineas }))} color={COLORS.azul} />
      </Panel>

      <Panel title="Top SKUs por tasa de sustitución">
        <HBar
          data={d.top_skus_por_tasa.slice(0, 10).map((s) => ({ label: s.sku, value: +(s.tasa * 100).toFixed(2) }))}
          suffix="%" color={COLORS.amarillo}
        />
      </Panel>

      <Panel title="Tasa de afectación por CEDIS (top 15)">
        <VBar
          data={d.top_cedis.slice(0, 15).map((c) => ({
            label: c.cedis, value: +(c.tasa_afectacion * 100).toFixed(1), color: nivelColor[c.nivel],
          }))}
          suffix="%"
        />
      </Panel>

      <Panel title="Top 10 pares de sustitución" subtitle="origen → destino (frecuencia)">
        <HBar
          data={d.top_pares.slice(0, 10).map((p) => ({
            label: `${truncate(p.origen, 10)}→${truncate(p.destino, 16)}`, value: p.frecuencia,
          }))}
          color={COLORS.rojo}
        />
      </Panel>

      <Panel title="Red de sustituciones" subtitle="SKUs más activos · arrastra los nodos">
        {grafo.data ? <NetworkGraph nodes={grafo.data.nodes} links={grafo.data.links} /> : <Skeleton />}
      </Panel>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}
      </div>
      <Skeleton /><Skeleton />
    </div>
  );
}
function Skeleton() {
  return <div className="card h-56 animate-pulse" />;
}
