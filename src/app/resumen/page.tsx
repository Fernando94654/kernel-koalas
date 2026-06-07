"use client";

import { api } from "~/trpc/react";
import { HBar, VBar } from "~/components/Charts";
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

export default function ResumenPage() {
  const eda = api.eda.useQuery();
  const grafo = api.grafo.useQuery();

  if (eda.isLoading) return <Loading />;
  if (eda.error ?? !eda.data) return <p className="text-sm text-rojo">No pudimos cargar la información. Por favor, recarga la página.</p>;

  const d = eda.data;
  const m = d.metricas_globales;

  const cards = [
    { label: "Tasa de cambios",         value: m.tasa_sustitucion_lineas + "%" },
    { label: "Centros de distribución", value: fmt(m.cedis_unicos) },
  ];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">Tendencias del mercado</h1>
        <p className="mt-0.5 text-xs text-muted">
          Descubre qué productos se sustituyen más y qué puedes esperar al hacer tu pedido.
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:gap-4">
        {cards.map(({ label, value }) => (
          <div key={label} className="card border-l-2 border-l-rojo !p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {label}
            </div>
            <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Productos con más cambios">
          <HBar
            data={d.top_skus_por_tasa.slice(0, 10).map((s) => ({
              label: s.sku,
              value: +(s.tasa * 100).toFixed(2),
            }))}
            suffix="%" color={COLORS.amarillo}
          />
        </Panel>
        <Panel title="Bodegas con más cambios (top 15)">
          <VBar
            data={d.top_cedis.slice(0, 15).map((c) => ({
              label: c.cedis,
              value: +(c.tasa_afectacion * 100).toFixed(1),
              color: nivelColor[c.nivel],
            }))}
            suffix="%" height={300}
          />
        </Panel>
      </div>

      {/* Full-width: substitution pairs */}
      <Panel
        title="Top 10 cambios más frecuentes"
        subtitle="producto original → reemplazo (frecuencia)"
        className="mb-4"
      >
        <HBar
          data={d.top_pares.slice(0, 10).map((p) => ({
            label: `${truncate(p.origen, 14)} → ${truncate(p.destino, 14)}`,
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
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="skeleton h-20 animate-pulse" />
        ))}
      </div>
      <div className="skeleton h-56 animate-pulse" />
      <div className="skeleton h-56 animate-pulse" />
    </div>
  );
}
