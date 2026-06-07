// Mapea el nombre de un producto a una imagen real de la bebida (en /public/productos)
// y, como respaldo, a un ícono + color de acento por categoría. Las imágenes se
// sirven localmente (descargadas de Open Food Facts), así que funcionan offline.

export type BebidaCategoria =
  | "cola"
  | "agua"
  | "jugo"
  | "energia"
  | "lacteo"
  | "vegetal"
  | "te"
  | "refresco";

type Visual = { glyph: string; tint: string };

// Acentos suaves por categoría — se usan como fondo tenue del thumbnail / fallback.
const VISUAL: Record<BebidaCategoria, Visual> = {
  cola:     { glyph: "🥤", tint: "#C20000" },
  agua:     { glyph: "💧", tint: "#2E9BD6" },
  jugo:     { glyph: "🧃", tint: "#E8A317" },
  energia:  { glyph: "⚡", tint: "#15924B" },
  lacteo:   { glyph: "🥛", tint: "#8A8A92" },
  vegetal:  { glyph: "🌱", tint: "#15924B" },
  te:       { glyph: "🍵", tint: "#15924B" },
  refresco: { glyph: "🥤", tint: "#C20000" },
};

// Reglas en orden de prioridad: primer match gana.
const REGLAS: [RegExp, BebidaCategoria][] = [
  [/agua|ciel|bonafont|topo\s?chico|mineral/i, "agua"],
  [/monster|powerade|energ|gatorade|vive|red\s?bull/i, "energia"],
  [/jugo|del\s?valle|nectar|néctar|valle\s?frut|frut|limon|naranja|manzana|durazno/i, "jugo"],
  [/leche|santa\s?clara|lala|deslact|yogur|yoghurt|lácteo|lacteo|crema/i, "lacteo"],
  [/ades|adés|almendra|soya|avena|vegetal|coco/i, "vegetal"],
  [/\bté\b|\bte\b|fuze|lipton|matcha|verde/i, "te"],
  [/coca|cola|pepsi|sidral|mundet|sprite|fanta|fresca|manzanita|sangr/i, "cola"],
];

export function categoriaBebida(nombre: string): BebidaCategoria {
  const n = nombre ?? "";
  for (const [re, cat] of REGLAS) if (re.test(n)) return cat;
  return "refresco";
}

export function visualBebida(nombre: string): Visual {
  return VISUAL[categoriaBebida(nombre)];
}

// ── Imágenes reales ──────────────────────────────────────────────────────
// ARCHIVO = "fuente de verdad": solo los archivos que EXISTEN en /public/productos.
// Para agregar una marca nueva: pon el archivo en esa carpeta y descomenta su línea.
const ARCHIVO: Record<string, string> = {
  "coca-cola":     "coca-cola.jpg",
  "pepsi":         "pepsi.jpg",
  "sprite":        "sprite.jpg",
  "fanta":         "fanta.jpg",
  "fresca":        "fresca.jpg",
  "sidral-mundet": "sidral-mundet.jpg",
  "ciel":          "ciel.jpg",
  "bonafont":      "bonafont.jpg",
  "topo-chico":    "topo-chico.png",
  "powerade":      "powerade.jpg",
  "gatorade":      "gatorade.jpg",
  "monster":       "monster.jpg",
  "del-valle":     "del-valle.jpg",
  "santa-clara":   "santa-clara.png",
  "ades":          "ades.jpeg",
  // ── Pendientes (descomenta al agregar el archivo correspondiente) ──
  // "agua":        "agua.jpg",          // agua genérica
   "dasani":      "dasani.jpg",        // agua Dasani
   "benedictino": "benedictino.jpg",   // agua mineral Benedictino / Güitig / Tesalia
   "fioravanti":  "fioravanti.jpg",    // refresco Fioravanti
  // ── Snacks y otros productos (no bebidas) que aparecen en riesgo ──
   "tostitos":    "tostitos-jalapenos.jpg", // Tostitos Jalapeños
   "stayfree":    "stayfree.jpg",            // Toallas Femeninas Stayfree
   "sarita":      "sarita-rizada.jpg",       // Saritas / Papa Sarita Rizada
   "bizcotela":   "bizcotelas.jpg",          // Bizcotelas
   "caffelato":   "caffelato.jpg",           // Caffelato
  // "crush":       "crush.jpg",         // refresco Crush
  // "schweppes":   "schweppes.jpg",     // agua tónica Schweppes
  // "predator":    "predator.jpg",      // energéticas (Predator / Fury / V220)
  // "aquarius":    "aquarius.jpg",      // bebida Aquarius
  // "vitaminwater":"vitaminwater.jpg",  // Glacéau Vitaminwater
  // "fuze-tea":    "fuze-tea.jpg",      // té Fuze Tea
  // "jugo":        "jugo.jpg",          // jugos varios (Pulpy / Cepita / Frutsi / Tampico / Profit / Joya)
  // "yogur":       "yogur.jpg",         // yogurt bebible (Toni / Chiqui / Mix)
};

// keyword detectada → slug de imagen. Primer match gana (¡el orden importa!).
const IMG_REGLAS: [RegExp, string][] = [
  // Snacks y otros (no bebidas) que aparecen en riesgo de sustitución
  [/tostitos/i, "tostitos"],
  [/stayfree|toallas?\s?femenin/i, "stayfree"],
  [/sarita/i, "sarita"],
  [/bizcotela/i, "bizcotela"],
  [/caffelato/i, "caffelato"],
  // Refrescos / colas
  [/coca|coca\s?-?cola/i, "coca-cola"],
  [/pepsi/i, "pepsi"],
  [/sprite/i, "sprite"],
  [/fanta/i, "fanta"],
  [/fresca/i, "fresca"],
  [/fioravanti/i, "fioravanti"],
  [/crush/i, "crush"],
  [/schweppes|t[oó]nica/i, "schweppes"],
  [/sidral|mundet|manzanita/i, "sidral-mundet"],
  // Aguas
  [/ciel/i, "ciel"],
  [/bonafont/i, "bonafont"],
  [/topo\s?chico/i, "topo-chico"],
  [/dasani/i, "dasani"],
  [/benedictino|g[uü]itig|tesalia/i, "benedictino"],
  // Energéticas / deportivas
  [/powerade/i, "powerade"],
  [/gatorade/i, "gatorade"],
  [/monster/i, "monster"],
  [/predator|fury|red\s?bull|v220|energ/i, "predator"],
  [/aquarius/i, "aquarius"],
  [/vitaminwater|glac[eé]au/i, "vitaminwater"],
  // Lácteos — ANTES que jugos para que "Leche/Yogurt … Frutilla" no caiga en jugo
  [/yogur|yoghurt/i, "yogur"],
  [/santa\s?clara|leche|avena|l[aá]cteo|lacteo/i, "santa-clara"],
  [/ades|adés|almendra|soya/i, "ades"],
  // Tés
  [/fuze|tea/i, "fuze-tea"],
  // Jugos / néctares
  [/pulpy|cepita|frutsi|tampico|profit|joya/i, "jugo"],
  [/del\s?valle|valle|jugo|nectar|néctar|frut|durazno/i, "del-valle"],
  // Agua genérica (al final)
  [/agua|mineral/i, "agua"],
];

// Devuelve la ruta de la imagen real, o null si no hay archivo (entonces se usa el ícono).
export function imagenBebida(nombre: string): string | null {
  const n = nombre ?? "";
  for (const [re, slug] of IMG_REGLAS) {
    if (re.test(n)) {
      const file = ARCHIVO[slug];
      if (file) return `/productos/${file}`;
      // si la regla coincide pero aún no hay archivo, seguimos buscando otra regla
    }
  }
  return null;
}
