// Carga los artefactos JSON una sola vez en memoria y expone helpers de consulta.
// (Equivalente al app.state.data del backend FastAPI.)
import "server-only";
import fs from "node:fs";
import path from "node:path";

import {
  PRIOR, W1, W2, W3, round4, clasificar, pedidoKey,
  type EdaArtifact, type ScoringArtifact, type SemaforoArtifact,
  type GraphArtifact, type PedidosArtifact, type Nivel,
} from "~/lib/model";

interface Store {
  eda: EdaArtifact;
  scoring: ScoringArtifact;
  semaforo: SemaforoArtifact;
  graph: GraphArtifact;
  pedidos: PedidosArtifact;
}

let store: Store | null = null;

function load(): Store {
  if (store) return store;
  const dir = path.resolve(process.cwd(), "artifacts");
  const read = <T>(name: string): T => {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) {
      throw new Error(
        `Falta el artefacto ${name}. Corre 'npm run prepare-data' en web/ antes de iniciar.`,
      );
    }
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  };
  store = {
    eda: read<EdaArtifact>("eda.json"),
    scoring: read<ScoringArtifact>("scoring.json"),
    semaforo: read<SemaforoArtifact>("semaforo.json"),
    graph: read<GraphArtifact>("graph.json"),
    pedidos: read<PedidosArtifact>("pedidos.json"),
  };
  return store;
}

// ---------- helpers ----------
export interface LineaScored {
  nombre_sku: string;
  quantity: number;
  score_linea: number;
  nivel: Nivel;
  historico: boolean;
  sustitutos_probables: { nombre: string; frecuencia: number }[];
}

export function getEda(): EdaArtifact {
  return load().eda;
}

export function getSustitutos(sku: string, topN = 3): { nombre: string; frecuencia: number }[] {
  const adj = load().graph.adj[sku.trim()];
  if (!adj) return [];
  return adj.slice(0, topN).map(([nombre, frecuencia]) => ({ nombre, frecuencia }));
}

export function getGraphPayload() {
  return load().graph.payload;
}

export function scoreLinea(cedis: string, sku: string): { score_riesgo: number; nivel: Nivel; n_total: number; n_sust: number; historico: boolean } {
  const { scoring } = load();
  const hit = scoring.lookup[cedis + " " + sku];
  if (hit) {
    const [score, nt, ns] = hit;
    return { score_riesgo: score, nivel: clasificar(score), n_total: nt, n_sust: ns, historico: true };
  }
  const tasaS2 = scoring.s2[sku] ?? PRIOR;
  const tasaS3 = scoring.s3[cedis] ?? 0;
  const score = round4(W1 * PRIOR + W2 * tasaS2 + W3 * tasaS3);
  return { score_riesgo: score, nivel: clasificar(score), n_total: 0, n_sust: 0, historico: false };
}

function scoreLineas(cedis: string, lineas: { nombre_sku: string; quantity: number }[]) {
  const out: LineaScored[] = [];
  let max = 0;
  for (const l of lineas) {
    const sku = l.nombre_sku.trim();
    const d = scoreLinea(cedis, sku);
    max = Math.max(max, d.score_riesgo);
    out.push({
      nombre_sku: sku,
      quantity: l.quantity,
      score_linea: d.score_riesgo,
      nivel: d.nivel,
      historico: d.historico,
      sustitutos_probables: d.nivel === "Verde" ? [] : getSustitutos(sku, 3),
    });
  }
  const score_pedido = round4(max);
  return { score_pedido, nivel_pedido: clasificar(score_pedido), lineas: out };
}

export function simular(cedis: string, lineas: { nombre_sku: string; quantity: number }[]) {
  const { scoring } = load();
  return {
    cedis,
    tasa_cedis: round4(scoring.s3[cedis] ?? 0),
    ...scoreLineas(cedis, lineas),
  };
}

export function getPedido(idRaw: string) {
  const { pedidos } = load();
  const key = pedidoKey(idRaw);
  const p = pedidos.pedidos[key];
  if (!p) return null;
  // Decodificar líneas planas [skuIdx, qty, ...]
  const lineas: { nombre_sku: string; quantity: number }[] = [];
  for (let i = 0; i < p.lineas.length; i += 2) {
    lineas.push({ nombre_sku: pedidos.skus[p.lineas[i]!]!, quantity: p.lineas[i + 1]! });
  }
  const scored = scoreLineas(p.cedis, lineas);
  return {
    cabecera: {
      id_pedido: key,
      customer_id: p.customer_id,
      cedis: p.cedis,
      pais: p.pais,
      business_unit: p.business_unit,
      status_final: p.status_final,
      total: p.total,
      n_lineas: lineas.length,
      ordenes_en_bucket: p.ordenes,
      nota_ambiguedad:
        p.ordenes > 1
          ? `id_pedido está colisionado por export en notación científica; este bucket agrupa ${p.ordenes} órdenes. CEDIS asignado por valor modal.`
          : null,
    },
    ...scored,
  };
}

export function getSemaforo(pais?: string, businessUnit?: string) {
  const { semaforo, eda } = load();
  const filas: {
    cedis: string; n_pedidos: number; lineas_rojo: number;
    lineas_amarillo: number; tasa_afectacion: number; nivel: Nivel;
  }[] = [];
  for (const c of eda.top_cedis) {
    const s = semaforo.cedis[c.cedis];
    if (!s) continue;
    let n = s.n_pedidos;
    if (pais) n = s.por_pais[pais] ?? 0;
    if (businessUnit) n = pais ? Math.min(n, s.por_bu[businessUnit] ?? 0) : (s.por_bu[businessUnit] ?? 0);
    if ((pais || businessUnit) && n === 0) continue;
    filas.push({
      cedis: c.cedis, n_pedidos: n, lineas_rojo: s.lineas_rojo,
      lineas_amarillo: s.lineas_amarillo, tasa_afectacion: s.tasa_afectacion, nivel: s.nivel,
    });
  }
  return filas;
}

export function getCedisDetalle(cedis: string) {
  const { scoring, semaforo } = load();
  const skus: { sku: string; n_total: number; n_sust: number; score: number; nivel: Nivel }[] = [];
  const prefix = cedis + " ";
  for (const [k, v] of Object.entries(scoring.lookup)) {
    if (!k.startsWith(prefix)) continue;
    const [score, nt, ns] = v;
    skus.push({ sku: k.slice(prefix.length), n_total: nt, n_sust: ns, score, nivel: clasificar(score) });
  }
  skus.sort((a, b) => b.score - a.score);
  return {
    cedis,
    tasa_afectacion: semaforo.cedis[cedis]?.tasa_afectacion ?? 0,
    skus: skus.slice(0, 30),
  };
}

// Para el contexto del chatbot
export function getPedidoScore(idRaw: string): { score: number; nivel: Nivel } | null {
  const p = getPedido(idRaw);
  if (!p) return null;
  return { score: p.score_pedido, nivel: p.nivel_pedido };
}
