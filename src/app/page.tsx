"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "~/trpc/react";
import { fmt, nivelColor } from "~/lib/ui";
import { ProductThumb } from "~/components/ProductThumb";
import type { Nivel } from "~/lib/model";

type Linea = {
  nombre_sku: string;
  quantity: number;
  score_linea: number;
  nivel: Nivel;
  historico: boolean;
  sustitutos_probables: { nombre: string; frecuencia: number }[];
};

type GroupedLinea = Linea & { count: number };

const RIESGO_LABEL: Record<Nivel, string> = {
  Rojo: "RIESGO ALTO",
  Amarillo: "RIESGO MEDIO",
  Verde: "RIESGO BAJO",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-4 w-1 rounded-full bg-rojo" />
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
    </div>
  );
}

function RiskSummary({ lineas }: { lineas: Linea[] }) {
  const totalUnidades = lineas.reduce((s, l) => s + l.quantity, 0);
  const unidadesEnRiesgoExact = lineas.reduce((s, l) => s + l.quantity * l.score_linea, 0);
  const unidadesEnRiesgo = Math.round(unidadesEnRiesgoExact);
  const lineasMarcadas = lineas.filter((l) => l.nivel !== "Verde").length;
  const pct = totalUnidades > 0 ? (unidadesEnRiesgoExact / totalUnidades) * 100 : 0;

  // Nivel del banner: derivado del % ponderado por unidades — consistente con lo que se muestra.
  const bannerNivel: Nivel = pct >= 8 ? "Rojo" : pct >= 3 ? "Amarillo" : "Verde";
  const color = nivelColor[bannerNivel];

  const headline =
    bannerNivel === "Verde"
      ? `Tu pedido sale prácticamente completo`
      : bannerNivel === "Amarillo"
        ? `${pct.toFixed(1)}% de tu pedido podría venir cambiado`
        : `Alto riesgo: ${pct.toFixed(1)}% de tu pedido podría venir sustituido`;

  const detail =
    unidadesEnRiesgo === 0
      ? `${totalUnidades} unidades · sin sustituciones probables · ${pct.toFixed(1)}% de riesgo`
      : `≈ ${unidadesEnRiesgo} de ${totalUnidades} unidades en riesgo · ${lineasMarcadas} producto${lineasMarcadas === 1 ? "" : "s"} marcado${lineasMarcadas === 1 ? "" : "s"}`;

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ border: `1px solid ${color}40`, background: `${color}0F` }}
    >
      <div className="flex items-stretch">
        <span className="w-1 shrink-0" style={{ background: color }} />
        <div className="px-4 py-3.5">
          <p className="text-[15px] font-bold leading-snug" style={{ color }}>
            {headline}
          </p>
          <p className="mt-1 text-[12px] text-muted">{detail}</p>
        </div>
      </div>
    </div>
  );
}

// Agrupa líneas duplicadas por SKU sumando cantidades.
function groupLineas(lineas: Linea[]): GroupedLinea[] {
  const map = new Map<string, GroupedLinea>();
  for (const l of lineas) {
    const ex = map.get(l.nombre_sku);
    if (ex) {
      ex.quantity += l.quantity;
      ex.count += 1;
    } else {
      map.set(l.nombre_sku, { ...l, count: 1 });
    }
  }
  // Ordenar: en riesgo primero, luego por cantidad desc
  return [...map.values()].sort((a, b) => {
    const ra = a.nivel === "Verde" ? 0 : a.nivel === "Amarillo" ? 1 : 2;
    const rb = b.nivel === "Verde" ? 0 : b.nivel === "Amarillo" ? 1 : 2;
    if (ra !== rb) return rb - ra;
    return b.quantity - a.quantity;
  });
}

type Eleccion = "original" | "sustituto";

function LineaCard({
  linea,
  eleccion,
  onElegir,
}: {
  linea: GroupedLinea;
  eleccion: Eleccion;
  onElegir: (e: Eleccion) => void;
}) {
  const enRiesgo = linea.nivel !== "Verde";
  const color = nivelColor[linea.nivel];
  const sust = linea.sustitutos_probables[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-card-hover">
      {/* Fila principal — estilo "Línea de Pedido" */}
      <div className="flex items-center gap-3 py-3 pr-3" style={{ borderLeft: `3px solid ${color}` }}>
        <span className="pl-3" />
        <ProductThumb nombre={linea.nombre_sku} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-tight text-ink">
            {linea.nombre_sku}
          </p>
          <span
            className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wide"
            style={{ color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {RIESGO_LABEL[linea.nivel]}
          </span>
          {(linea.count > 1 || !linea.historico) && (
            <p className="mt-0.5 text-[10px] text-muted">
              {linea.count > 1 && <span>{linea.count} entradas</span>}
              {linea.count > 1 && !linea.historico && " · "}
              {!linea.historico && <span>sin historial</span>}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-bold leading-none text-ink">{linea.quantity}</p>
          <p className="mt-0.5 text-[10px] font-medium text-muted">Unidades</p>
          <p className="mt-1 font-mono text-[10px] text-muted">
            {(linea.score_linea * 100).toFixed(1)}% riesgo
          </p>
        </div>
      </div>

      {/* Selector original ↔ sustituto: solo si hay sustituto probable */}
      {enRiesgo && sust && (
        <div className="grid grid-cols-2 gap-1.5 border-t border-border bg-surface p-1.5">
          <button
            onClick={() => onElegir("original")}
            className="rounded-xl px-2.5 py-2 text-left text-[11px] transition-colors"
            style={{
              background: eleccion === "original" ? `${color}1F` : "transparent",
              border: `1px solid ${eleccion === "original" ? color + "88" : "transparent"}`,
              color: "var(--color-ink)",
            }}
          >
            <span className="block font-mono text-[9px] font-semibold uppercase tracking-wide text-muted">
              Mantener
            </span>
            <span className="block truncate font-medium">{linea.nombre_sku}</span>
          </button>
          <button
            onClick={() => onElegir("sustituto")}
            className="rounded-xl px-2.5 py-2 text-left text-[11px] transition-colors"
            style={{
              background: eleccion === "sustituto" ? `${color}1F` : "transparent",
              border: `1px solid ${eleccion === "sustituto" ? color + "88" : "transparent"}`,
              color: "var(--color-ink)",
            }}
          >
            <span className="block font-mono text-[9px] font-semibold uppercase tracking-wide text-muted">
              Aceptar reemplazo
            </span>
            <span className="flex items-center gap-1.5">
              <ProductThumb nombre={sust.nombre} size={22} />
              <span className="min-w-0 truncate font-medium">{sust.nombre}</span>
            </span>
            <span className="block text-[10px] text-muted">ocurre {sust.frecuencia}× en históricos</span>
          </button>
        </div>
      )}
    </div>
  );
}

function LineasCards({ lineas }: { lineas: Linea[] }) {
  const grouped = useMemo(() => groupLineas(lineas), [lineas]);
  const [elecciones, setElecciones] = useState<Record<string, Eleccion>>({});

  const aceptados = Object.values(elecciones).filter((e) => e === "sustituto").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
          {grouped.length} producto{grouped.length === 1 ? "" : "s"}
        </p>
        {aceptados > 0 && (
          <p className="text-[11px] text-muted">
            {aceptados} reemplazo{aceptados === 1 ? "" : "s"} aceptado{aceptados === 1 ? "" : "s"}
          </p>
        )}
      </div>
      <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
        {grouped.map((l) => (
          <LineaCard
            key={l.nombre_sku}
            linea={l}
            eleccion={elecciones[l.nombre_sku] ?? "original"}
            onElegir={(e) => setElecciones((prev) => ({ ...prev, [l.nombre_sku]: e }))}
          />
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-ink">{value}</div>
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

  // Si el texto está vacío, muestra los primeros 30; si no, filtra.
  const filtered = (
    value.trim() === ""
      ? items.slice(0, 30)
      : items.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 30)
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const exactMatch = items.includes(value);

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        className="input w-full"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && filtered[0] && !exactMatch) {
            onChange(filtered[0]);
            setOpen(false);
          }
        }}
        autoComplete="off"
      />
      {open && (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-y-auto rounded-xl border py-1"
          style={{
            background: "var(--color-card)",
            borderColor: "var(--color-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,.18)",
            maxHeight: 240,
          }}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[12px] text-muted">Sin coincidencias</li>
          ) : (
            filtered.map((s) => (
              <li
                key={s}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-surface"
                style={{ color: "var(--color-ink)" }}
                onMouseDown={() => { onChange(s); setOpen(false); }}
              >
                <ProductThumb nombre={s} size={24} />
                <span className="min-w-0 truncate">{s}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function SearchPickerEnter(props: {
  value: string;
  onChange: (v: string) => void;
  items: string[];
  placeholder: string;
  onEnter: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    props.value.trim() === ""
      ? props.items.slice(0, 30)
      : props.items
          .filter((s) => s.toLowerCase().includes(props.value.toLowerCase()))
          .slice(0, 30);

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
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => { props.onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter") {
            // si hay match parcial, selecciónalo; si no, dispara el callback
            if (!props.items.includes(props.value) && filtered[0]) {
              props.onChange(filtered[0]);
              setOpen(false);
              return;
            }
            setOpen(false);
            props.onEnter();
          }
        }}
        autoComplete="off"
      />
      {open && (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-y-auto rounded-xl border py-1"
          style={{
            background: "var(--color-card)",
            borderColor: "var(--color-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,.18)",
            maxHeight: 240,
          }}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[12px] text-muted">Sin coincidencias</li>
          ) : (
            filtered.map((s) => (
              <li
                key={s}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-surface"
                style={{ color: "var(--color-ink)" }}
                onMouseDown={() => { props.onChange(s); setOpen(false); }}
              >
                <ProductThumb nombre={s} size={24} />
                <span className="min-w-0 truncate">{s}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

type Tab = "rastreador" | "simulador";

export default function PedidoPage() {
  const eda = api.eda.useQuery();
  const cat = eda.data?.catalogos;

  const [tab, setTab] = useState<Tab>("rastreador");

  // ── Search existing order ──
  const [idInput, setIdInput] = useState("");
  const [queryId, setQueryId] = useState<string | null>(null);
  const pedido = api.pedido.useQuery({ id: queryId ?? "" }, { enabled: !!queryId });

  // Deep-link: pre-fill from ?id= so a shared URL opens the verdict immediately.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
      setIdInput(id);
      setQueryId(id);
    }
  }, []);

  // ── Simulator ──
  const [cedis,  setCedis]  = useState("");
  const [sku,    setSku]    = useState("");
  const [qty,    setQty]    = useState(1);
  const [lineas, setLineas] = useState<{ nombre_sku: string; quantity: number }[]>([]);
  const simular = api.simular.useMutation();
  const registrar = api.registrarPedido.useMutation();

  const cedisValid = cat?.cedis.includes(cedis) ?? false;
  const skuValid = cat?.skus.includes(sku) ?? false;
  const canAdd = sku.trim().length > 0;

  const addLinea = () => {
    if (!canAdd) return;
    setLineas((prev) => [...prev, { nombre_sku: sku.trim(), quantity: qty || 1 }]);
    setSku("");
    setQty(1);
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Mis Pedidos</h1>
        <p className="mt-1 text-[13px] text-muted">
          Revisa un pedido que ya realizaste o arma tu lista para anticipar si te llegará completo.
        </p>
      </div>

      {/* Segmented tabs: Rastreador / Simulador */}
      <div className="mb-5 inline-flex rounded-2xl border border-border bg-card p-1">
        {(["rastreador", "simulador"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative rounded-xl px-5 py-2 text-[13px] font-semibold capitalize transition-colors"
            style={
              tab === t
                ? { background: "var(--rojo)", color: "#fff" }
                : { color: "var(--color-muted)" }
            }
          >
            {t === "rastreador" ? "Rastreador" : "Simulador"}
          </button>
        ))}
      </div>

      {/* ── Rastreador ── */}
      {tab === "rastreador" && (
        <section className="card">
          <label className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
            ID de Pedido
          </label>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Ej. 8895360000000000000"
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
            <div className="mt-4 space-y-4">
              <RiskSummary lineas={pedido.data.lineas as Linea[]} />

              <div className="grid grid-cols-3 gap-2">
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
                  className="rounded-xl px-3 py-2.5 text-[11px]"
                  style={{
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-muted)",
                  }}
                >
                  ⚠️ {pedido.data.cabecera.nota_ambiguedad}
                </div>
              )}

              <div>
                <SectionHeader title="Líneas de Pedido" />
                <LineasCards lineas={pedido.data.lineas as Linea[]} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Simulador ── */}
      {tab === "simulador" && (
        <section className="card">
          <SectionHeader title="Armar nuevo pedido" />

          <label className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
            Selecciona tu bodega
          </label>
          <SearchPicker
            value={cedis}
            onChange={setCedis}
            items={cat?.cedis ?? []}
            placeholder="Escribe el código de tu bodega…"
          />
          {cedis && !cedisValid ? (
            <p className="mb-3 mt-1 text-[10px] text-rojo">
              Esa bodega no existe — selecciona una de la lista
            </p>
          ) : (
            <p className="mb-3 mt-1 text-[10px] text-muted">
              {cedisValid ? `✓ Bodega ${cedis} confirmada` : "Haz click en el campo para ver opciones"}
            </p>
          )}

          <label className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
            Añadir productos
          </label>
          <div className="flex gap-2">
            <SearchPickerEnter
              value={sku}
              onChange={setSku}
              items={cat?.skus ?? []}
              placeholder="Escribe el nombre del producto…"
              onEnter={addLinea}
            />
            <input
              className="input !w-16 text-center"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
            />
            <button
              className="btn shrink-0 !px-4"
              onClick={addLinea}
              disabled={!canAdd}
            >
              Agregar
            </button>
          </div>
          {sku && !skuValid && (
            <p className="mt-1 text-[10px]" style={{ color: "var(--color-muted)" }}>
              ⚠ Ese nombre no existe en el catálogo — se calculará con la tasa promedio del CEDIS.
            </p>
          )}

          {/* Lista de productos agregados (con estado vacío visible) */}
          <div className="mt-3">
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted">
              Productos en este pedido ({lineas.length})
            </p>
            {lineas.length === 0 ? (
              <div
                className="rounded-xl border border-dashed px-3 py-4 text-center text-[12px] text-muted"
                style={{ borderColor: "var(--color-border)" }}
              >
                Aún no agregaste productos. Escribe arriba y presiona <strong>Agregar</strong> o <kbd>Enter</kbd>.
              </div>
            ) : (
              <div className="space-y-1">
                {lineas.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-2 text-sm"
                  >
                    <ProductThumb nombre={l.nombre_sku} size={28} />
                    <span className="min-w-0 flex-1 break-words text-ink">
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
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="btn flex-1"
              disabled={!cedisValid || !lineas.length || simular.isPending}
              onClick={() => simular.mutate({ cedis, lineas })}
              title={
                !cedisValid ? "Selecciona una bodega válida" :
                !lineas.length ? "Agrega al menos un producto" :
                "Verificar disponibilidad"
              }
            >
              {simular.isPending ? "Calculando…" : "Verificar disponibilidad"}
            </button>
            <button
              className="btn-ghost"
              onClick={() => { setLineas([]); simular.reset(); registrar.reset(); }}
            >
              Limpiar
            </button>
          </div>

          {simular.data && (
            <div className="mt-4 space-y-3">
              <RiskSummary lineas={simular.data.lineas as Linea[]} />
              <p className="text-[11px] text-muted">
                Bodega: <span className="font-semibold text-ink">{simular.data.cedis}</span>
                {" · "}tasa de cambios histórica del CEDIS: {(simular.data.tasa_cedis * 100).toFixed(1)}%
              </p>
              <div>
                <SectionHeader title="Líneas de Pedido" />
                <LineasCards lineas={simular.data.lineas as Linea[]} />
              </div>

              {/* Registrar el pedido */}
              {!registrar.data && (
                <button
                  className="btn w-full"
                  disabled={registrar.isPending}
                  onClick={() => registrar.mutate({ cedis, lineas })}
                >
                  {registrar.isPending ? "Registrando…" : "Registrar este pedido"}
                </button>
              )}

              {registrar.data && (
                <div
                  className="rounded-2xl px-4 py-4"
                  style={{
                    border: `1px solid ${nivelColor.Verde}55`,
                    background: `${nivelColor.Verde}12`,
                  }}
                >
                  <p className="text-[14px] font-bold" style={{ color: nivelColor.Verde }}>
                    ✅ Pedido registrado
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    ID: <span className="font-mono text-ink">{registrar.data.id_pedido}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    Te avisaremos antes del envío si alguno de tus productos podría venir cambiado.
                  </p>
                  <a
                    href={`/?id=${registrar.data.id_pedido}`}
                    className="mt-2 inline-block text-[11px] font-semibold underline"
                    style={{ color: nivelColor.Verde }}
                  >
                    Ver mi pedido →
                  </a>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
