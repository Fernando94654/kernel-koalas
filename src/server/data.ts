import "server-only";
import {
  PRIOR, W1, W2, W3, round4, clasificar, pedidoKey,
  type EdaArtifact, type GraphArtifact, type Nivel,
} from "~/lib/model";
import { getDb } from "~/server/db";

// ── In-memory cache for small, frequently accessed data ────────────────
// EDA (~87 KB), graph adjacency (~37 KB), and scoring fallback rates are
// fetched from MongoDB once and kept in memory for the process lifetime.
interface LightStore {
  eda: EdaArtifact;
  graphAdj: Record<string, [string, number][]>;
  graphPayload: GraphArtifact["payload"];
  s2: Record<string, number>;
  s3: Record<string, number>;
}
let lightStore: LightStore | null = null;

async function getLightStore(): Promise<LightStore> {
  if (lightStore) return lightStore;
  const db = await getDb();
  const [edaDoc, graphDoc, metaDoc] = await Promise.all([
    db.collection("eda").findOne({ _id: "eda" as never }),
    db.collection("graph").findOne({ _id: "graph" as never }),
    db.collection("scoring").findOne({ _id: "__meta__" as never }),
  ]);
  if (!edaDoc || !graphDoc || !metaDoc) {
    throw new Error("Data not found in MongoDB. Run 'npm run seed-mongo' first.");
  }
  const { _id: _e, ...eda } = edaDoc;
  const { _id: _g, ...graph } = graphDoc;
  lightStore = {
    eda: eda as unknown as EdaArtifact,
    graphAdj: (graph as unknown as GraphArtifact).adj,
    graphPayload: (graph as unknown as GraphArtifact).payload,
    s2: (metaDoc as Record<string, unknown>).s2 as Record<string, number>,
    s3: (metaDoc as Record<string, unknown>).s3 as Record<string, number>,
  };
  return lightStore;
}

// ── Public helpers ──────────────────────────────────────────────────────

export interface LineaScored {
  nombre_sku: string;
  quantity: number;
  score_linea: number;
  nivel: Nivel;
  historico: boolean;
  sustitutos_probables: { nombre: string; frecuencia: number }[];
}

export async function getEda(): Promise<EdaArtifact> {
  return (await getLightStore()).eda;
}

export async function getGraphPayload(): Promise<GraphArtifact["payload"]> {
  return (await getLightStore()).graphPayload;
}

export async function getSustitutos(sku: string, topN = 3): Promise<{ nombre: string; frecuencia: number }[]> {
  const { graphAdj } = await getLightStore();
  const adj = graphAdj[sku.trim()];
  if (!adj) return [];
  return adj.slice(0, topN).map(([nombre, frecuencia]) => ({ nombre, frecuencia }));
}

// Batch scoring lookup — one MongoDB round-trip for all lines in an order.
async function batchGetScoring(keys: string[]): Promise<Map<string, [number, number, number]>> {
  if (!keys.length) return new Map();
  const db = await getDb();
  const docs = await db
    .collection("scoring")
    .find({ _id: { $in: keys as never[] } })
    .toArray();
  return new Map(
    docs.map((d) => [d._id as unknown as string, [d.score as number, d.n_total as number, d.n_sust as number]]),
  );
}

async function scoreLineas(cedis: string, lineas: { nombre_sku: string; quantity: number }[]) {
  const { s2, s3 } = await getLightStore();
  const keys = lineas.map((l) => cedis + " " + l.nombre_sku.trim());
  const hits = await batchGetScoring(keys);

  const out: LineaScored[] = [];
  let max = 0;

  for (const l of lineas) {
    const sku = l.nombre_sku.trim();
    const hit = hits.get(cedis + " " + sku);
    let score_riesgo: number, nivel: Nivel, n_total: number, n_sust: number, historico: boolean;

    if (hit) {
      [score_riesgo, n_total, n_sust] = hit;
      nivel = clasificar(score_riesgo);
      historico = true;
    } else {
      const tasaS2 = s2[sku] ?? PRIOR;
      const tasaS3 = s3[cedis] ?? 0;
      score_riesgo = round4(W1 * PRIOR + W2 * tasaS2 + W3 * tasaS3);
      nivel = clasificar(score_riesgo);
      n_total = 0; n_sust = 0; historico = false;
    }

    max = Math.max(max, score_riesgo);
    out.push({
      nombre_sku: sku,
      quantity: l.quantity,
      score_linea: score_riesgo,
      nivel,
      historico,
      sustitutos_probables: nivel === "Verde" ? [] : await getSustitutos(sku, 3),
    });
  }

  const score_pedido = round4(max);
  return { score_pedido, nivel_pedido: clasificar(score_pedido), lineas: out };
}

export async function simular(cedis: string, lineas: { nombre_sku: string; quantity: number }[]) {
  const { s3 } = await getLightStore();
  return {
    cedis,
    tasa_cedis: round4(s3[cedis] ?? 0),
    ...(await scoreLineas(cedis, lineas)),
  };
}

export async function getPedido(idRaw: string) {
  const db = await getDb();
  const key = pedidoKey(idRaw);
  const p = await db.collection("orders").findOne({ _id: key as never });
  if (!p) return null;

  const lineas = p.lineas as { nombre_sku: string; quantity: number }[];
  const scored = await scoreLineas(p.cedis as string, lineas);

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
        (p.ordenes as number) > 1
          ? `id_pedido está colisionado por export en notación científica; este bucket agrupa ${p.ordenes as number} órdenes. CEDIS asignado por valor modal.`
          : null,
    },
    ...scored,
  };
}

export async function getSemaforo(pais?: string, businessUnit?: string) {
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (pais) filter[`por_pais.${pais}`] = { $gt: 0 };
  if (businessUnit) filter[`por_bu.${businessUnit}`] = { $gt: 0 };

  const docs = await db
    .collection("semaforo")
    .find(filter)
    .sort({ tasa_afectacion: -1 })
    .toArray();

  return docs.map((s) => ({
    cedis: s._id as unknown as string,
    n_pedidos: pais
      ? ((s.por_pais as Record<string, number>)[pais] ?? 0)
      : businessUnit
        ? ((s.por_bu as Record<string, number>)[businessUnit] ?? 0)
        : (s.n_pedidos as number),
    lineas_rojo: s.lineas_rojo as number,
    lineas_amarillo: s.lineas_amarillo as number,
    tasa_afectacion: s.tasa_afectacion as number,
    nivel: s.nivel as Nivel,
  }));
}

export async function getCedisDetalle(cedis: string) {
  const db = await getDb();
  const [semaforoDoc, scoringDocs] = await Promise.all([
    db.collection("semaforo").findOne({ _id: cedis as never }),
    db.collection("scoring")
      .find({ _id: { $regex: `^${cedis} ` } as never })
      .toArray(),
  ]);

  const skus = scoringDocs
    .map((d) => ({
      sku: (d._id as unknown as string).slice(cedis.length + 1),
      n_total: d.n_total as number,
      n_sust: d.n_sust as number,
      score: d.score as number,
      nivel: clasificar(d.score as number),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  return {
    cedis,
    tasa_afectacion: (semaforoDoc?.tasa_afectacion as number | undefined) ?? 0,
    skus,
  };
}

// Used by the chatbot for RAG context
export async function getPedidoScore(idRaw: string): Promise<{ score: number; nivel: Nivel } | null> {
  const p = await getPedido(idRaw);
  if (!p) return null;
  return { score: p.score_pedido, nivel: p.nivel_pedido };
}
