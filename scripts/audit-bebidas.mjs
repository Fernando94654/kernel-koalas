// Lista las BEBIDAS del catálogo agrupadas por marca, marcando cuáles ya tienen
// imagen dedicada y cuáles faltan (ordenado por volumen de unidades).
// Uso: node scripts/audit-bebidas.mjs
import { createReadStream, readdirSync } from "node:fs";
import { parse } from "csv-parse";
import path from "node:path";

const CSV = path.join(process.cwd(), "data", "OrderDetails.csv");
const IMG_DIR = path.join(process.cwd(), "public", "productos");

// ¿Es bebida? (filtra el catálogo general de abarrotes)
const ES_BEBIDA =
  /agua|jugo|leche|cola|refresco|gaseosa|n[eé]ctar|\bt[eé]\b|tea|energ|yogur|yoghurt|bebida|gatorade|powerade|pulp|tampico|soda|t[oó]nic|malta|avena|soya|almendra|hidratante|electrol|deli|natur|frut|sport|vive|monster|red\s?bull|fuze|del\s?valle|ciel|bonafont|dasani|benedictino|g[uü]itig|tesalia|sprite|fanta|pepsi|fioravanti|tropical|manzana|naranja|durazno|sidral|fresca/i;

// Marcas con imagen dedicada (regex -> slug), igual que src/lib/producto.ts
const IMG_REGLAS = [
  [/coca|coca\s?-?cola/i, "coca-cola"],
  [/pepsi/i, "pepsi"],
  [/sprite/i, "sprite"],
  [/fanta/i, "fanta"],
  [/fresca/i, "fresca"],
  [/sidral|mundet|manzanita/i, "sidral-mundet"],
  [/ciel/i, "ciel"],
  [/bonafont/i, "bonafont"],
  [/topo\s?chico/i, "topo-chico"],
  [/powerade/i, "powerade"],
  [/gatorade/i, "gatorade"],
  [/monster/i, "monster"],
  [/del\s?valle|valle|jugo|nectar|néctar|frut|durazno/i, "del-valle"],
  [/santa\s?clara|leche|lácteo|lacteo/i, "santa-clara"],
  [/ades|adés|almendra|soya|avena/i, "ades"],
  [/agua|mineral/i, "agua"],
];
const presentes = new Set(readdirSync(IMG_DIR).map((f) => f.replace(/\.[^.]+$/, "")));
function slugFor(n) { for (const [re, s] of IMG_REGLAS) if (re.test(n)) return s; return null; }

// Marca = primeras 2 palabras significativas
function marca(n) {
  const w = n.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter((x) => x.length > 1);
  return (w.slice(0, 2).join(" ") || n).toLowerCase();
}

const porMarca = new Map(); // marca -> { unidades, slug, dedicada, ejemplos[] }
const parser = createReadStream(CSV).pipe(parse({ columns: true, relax_quotes: true, skip_records_with_error: true }));

parser.on("data", (row) => {
  const nombre = (row.nombre_sku_solicitado ?? "").trim();
  if (!nombre || !ES_BEBIDA.test(nombre)) return;
  const q = parseInt(row.Quantity, 10) || 0;
  const m = marca(nombre);
  const slug = slugFor(nombre);
  const e = porMarca.get(m) ?? { unidades: 0, slug, ejemplos: [] };
  e.unidades += q;
  if (!e.slug) e.slug = slug;
  if (e.ejemplos.length < 2) e.ejemplos.push(nombre.slice(0, 46));
  porMarca.set(m, e);
});

parser.on("end", () => {
  const list = [...porMarca.entries()].map(([m, e]) => ({
    marca: m,
    unidades: e.unidades,
    tieneImg: !!(e.slug && presentes.has(e.slug)),
    slug: e.slug && presentes.has(e.slug) ? e.slug : (e.slug ?? "—"),
    ejemplos: e.ejemplos,
  }));

  const con = list.filter((x) => x.tieneImg).sort((a, b) => b.unidades - a.unidades);
  const sin = list.filter((x) => !x.tieneImg).sort((a, b) => b.unidades - a.unidades);

  console.log(`\n=== BEBIDAS · marcas distintas: ${list.length} ===`);
  console.log(`Con imagen: ${con.length}   |   Sin imagen: ${sin.length}\n`);

  console.log(`--- YA TIENEN IMAGEN (marca → slug) ---`);
  for (const x of con.slice(0, 30))
    console.log(`  ✓ ${x.marca.padEnd(22)} ${String(x.unidades).padStart(8)} u   [${x.slug}]`);

  console.log(`\n--- FALTAN IMAGEN (top 45 por volumen) ---`);
  for (const x of sin.slice(0, 45)) {
    console.log(`  ✗ ${x.marca.padEnd(22)} ${String(x.unidades).padStart(8)} u   · ${x.ejemplos[0] ?? ""}`);
  }
});
