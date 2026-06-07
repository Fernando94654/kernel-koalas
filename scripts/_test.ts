import { createCaller } from "../src/server/api/root.js";

async function main() {
  const caller = createCaller({ headers: new Headers() });

  const eda = await caller.eda();
  console.log("metricas:", eda.metricas_globales);
  console.log("top par:", eda.top_pares[0]);
  console.log("top cedis[0]:", eda.top_cedis[0]);
  console.log("catalogos: cedis=%d skus=%d bu=%d", eda.catalogos.cedis.length, eda.catalogos.skus.length, eda.catalogos.business_units.length);

  const sem = await caller.semaforo({ pais: "México" });
  console.log("\nsemaforo México: %d cedis, primero=", sem.cedis.length, sem.cedis[0]);

  const sim = await caller.simular({ cedis: "3004", lineas: [{ nombre_sku: "Coca - Cola", quantity: 12 }, { nombre_sku: "Ades Soya Light Natural", quantity: 6 }] });
  console.log("\nsimular 3004:", { score: sim.score_pedido, nivel: sim.nivel_pedido, tasa: sim.tasa_cedis });
  console.log("  linea0:", sim.lineas[0]);
  console.log("  linea1 sustitutos:", sim.lineas[1]?.sustitutos_probables);

  const sust = await caller.sustitutos({ sku: "Coca - Cola" });
  console.log("\nsustitutos Coca - Cola:", sust.sustitutos_probables);

  const ped = await caller.pedido({ id: "8839440000000000000" });
  console.log("\npedido: cedis=%s n_lineas=%s score=%s nota=%s",
    ped?.cabecera.cedis, ped?.cabecera.n_lineas, ped?.score_pedido, ped?.cabecera.nota_ambiguedad ? "sí" : "no");

  const chat = await caller.chat({ message: "¿Cuáles son los CEDIS en zona roja?", history: [] });
  console.log("\nchat provider:", chat.provider, "| resp:", chat.response.slice(0, 90));
}
main().catch((e) => { console.error(e); process.exit(1); });
