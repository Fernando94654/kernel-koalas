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
// Archivos presentes en /public/productos/ (con su extensión real).
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
  "agua":          "agua.jpg",
};

// keyword detectada → slug de imagen. Primer match gana.
const IMG_REGLAS: [RegExp, string][] = [
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
  // Jugos / néctares → imagen de Del Valle (jugo)
  [/del\s?valle|valle|jugo|nectar|néctar|frut|durazno/i, "del-valle"],
  [/santa\s?clara|leche|lácteo|lacteo/i, "santa-clara"],
  [/ades|adés|almendra|soya|avena/i, "ades"],
  [/agua|mineral/i, "agua"],
];

// Devuelve la ruta de la imagen real o null si no hay match (usa el ícono).
export function imagenBebida(nombre: string): string | null {
  const n = nombre ?? "";
  for (const [re, slug] of IMG_REGLAS) {
    if (re.test(n)) {
      const file = ARCHIVO[slug];
      if (file) return `/productos/${file}`;
    }
  }
  return null;
}
