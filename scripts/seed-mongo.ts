/**
 * One-time seeding script: reads artifacts/*.json and upserts all data into MongoDB.
 * Run: npm run seed-mongo
 *
 * Safe to re-run — drops and recreates each collection every time.
 */
import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  EdaArtifact, ScoringArtifact, SemaforoArtifact,
  GraphArtifact, PedidosArtifact,
} from "../src/lib/model.js";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌  MONGODB_URI is not set. Add it to your .env file and run again.");
  process.exit(1);
}

const dir = dirname(fileURLToPath(import.meta.url));
const artifactsDir = resolve(dir, "../artifacts");

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(artifactsDir, name), "utf-8")) as T;
}

const BATCH = 500;

async function dropAndSeed(client: MongoClient) {
  const db = client.db("order-rescue");

  // ── EDA (single document) ────────────────────────────────────────────
  console.log("Seeding eda…");
  const eda = readJson<EdaArtifact>("eda.json");
  await db.collection("eda").drop().catch(() => {});
  await db.collection("eda").insertOne({ _id: "eda" as never, ...eda });
  console.log("  ✓ eda (1 doc)");

  // ── GRAPH (single document) ─────────���────────────────────────────────
  console.log("Seeding graph…");
  const graph = readJson<GraphArtifact>("graph.json");
  await db.collection("graph").drop().catch(() => {});
  await db.collection("graph").insertOne({ _id: "graph" as never, ...graph });
  console.log("  ✓ graph (1 doc)");

  // ── SCORING ──────────────────────────────────────────────────────────
  console.log("Seeding scoring…");
  const scoring = readJson<ScoringArtifact>("scoring.json");
  await db.collection("scoring").drop().catch(() => {});

  // One doc per (cedis, sku) key
  const lookupEntries = Object.entries(scoring.lookup);
  for (let i = 0; i < lookupEntries.length; i += BATCH) {
    const batch = lookupEntries.slice(i, i + BATCH).map(([key, [score, n_total, n_sust]]) => ({
      _id: key as never,
      score,
      n_total,
      n_sust,
    }));
    await db.collection("scoring").insertMany(batch);
  }

  // Fallback rates stored as a meta document
  await db.collection("scoring").insertOne({
    _id: "__meta__" as never,
    s2: scoring.s2,
    s3: scoring.s3,
  });
  console.log(`  ✓ scoring (${lookupEntries.length} lookup docs + 1 meta)`);

  // ── SEMAFORO ─────────────────────────────────────────────────────────
  console.log("Seeding semaforo…");
  const semaforo = readJson<SemaforoArtifact>("semaforo.json");
  await db.collection("semaforo").drop().catch(() => {});
  const semaforoDocs = Object.entries(semaforo.cedis).map(([cedis, data]) => ({
    _id: cedis as never,
    ...data,
  }));
  await db.collection("semaforo").insertMany(semaforoDocs);
  await db.collection("semaforo").createIndex({ tasa_afectacion: -1 });
  console.log(`  ✓ semaforo (${semaforoDocs.length} docs)`);

  // ── ORDERS ──────��────────────────────────────────────────────────────
  console.log("Seeding orders (this may take a moment)…");
  const pedidos = readJson<PedidosArtifact>("pedidos.json");
  await db.collection("orders").drop().catch(() => {});

  const orderEntries = Object.entries(pedidos.pedidos);
  let inserted = 0;
  for (let i = 0; i < orderEntries.length; i += BATCH) {
    const batch = orderEntries.slice(i, i + BATCH).map(([key, p]) => {
      // Decode compressed lineas: [skuIdx, qty, skuIdx, qty, ...]
      const lineas: { nombre_sku: string; quantity: number }[] = [];
      for (let j = 0; j < p.lineas.length; j += 2) {
        lineas.push({
          nombre_sku: pedidos.skus[p.lineas[j]!]!,
          quantity: p.lineas[j + 1]!,
        });
      }
      return {
        _id: key as never,
        cedis: p.cedis,
        pais: p.pais,
        business_unit: p.business_unit,
        status_final: p.status_final,
        customer_id: p.customer_id,
        total: p.total,
        ordenes: p.ordenes,
        lineas,
      };
    });
    await db.collection("orders").insertMany(batch, { ordered: false });
    inserted += batch.length;
    process.stdout.write(`\r  inserting… ${inserted}/${orderEntries.length}`);
  }
  console.log(`\n  ✓ orders (${orderEntries.length} docs)`);

  console.log("\n✅  All collections seeded successfully.");
}

const client = new MongoClient(uri);
try {
  await client.connect();
  await dropAndSeed(client);
} finally {
  await client.close();
}
