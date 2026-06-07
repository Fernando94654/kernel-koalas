// Descarga imágenes reales de bebidas desde Open Food Facts a public/productos/.
// Uso: node scripts/fetch-product-images.mjs
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "productos");

// slug -> términos de búsqueda (en orden de preferencia)
const PRODUCTS = {
  "coca-cola":     ["coca cola 600", "coca cola"],
  "pepsi":         ["pepsi 600", "pepsi cola"],
  "sprite":        ["sprite refresco", "sprite"],
  "fanta":         ["fanta naranja", "fanta"],
  "fresca":        ["fresca toronja", "fresca refresco"],
  "sidral-mundet": ["sidral mundet", "manzanita sol"],
  "ciel":          ["ciel agua", "agua ciel"],
  "bonafont":      ["bonafont agua", "bonafont"],
  "topo-chico":    ["topo chico agua mineral", "topo chico"],
  "powerade":      ["powerade", "powerade ion4"],
  "gatorade":      ["gatorade", "gatorade lima limon"],
  "monster":       ["monster energy", "monster energy drink"],
  "del-valle":     ["del valle jugo", "jugos del valle"],
  "santa-clara":   ["santa clara leche", "leche entera"],
  "ades":          ["ades almendra", "ades soya"],
  "agua":          ["agua natural botella"],
  "jugo":          ["jugo naranja", "nectar durazno"],
  "refresco":      ["refresco cola"],
};

async function searchImage(term) {
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
    encodeURIComponent(term) +
    "&json=1&page_size=5&fields=product_name,image_front_url,countries_tags";
  const res = await fetch(url, { headers: { "User-Agent": "OrderRescue/1.0 (hackathon)" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const prods = (data.products ?? []).filter((p) => p.image_front_url);
  // Prefiere productos de México/España (etiquetas en español)
  prods.sort((a, b) => score(b) - score(a));
  return prods[0]?.image_front_url ?? null;
}

function score(p) {
  const c = (p.countries_tags ?? []).join(",");
  let s = 0;
  if (c.includes("mexico")) s += 3;
  if (c.includes("spain")) s += 1;
  return s;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const done = [];
  const failed = [];
  for (const [slug, terms] of Object.entries(PRODUCTS)) {
    let saved = false;
    for (const term of terms) {
      try {
        const img = await searchImage(term);
        if (!img) { await sleep(1200); continue; }
        const r = await fetch(img, { headers: { "User-Agent": "OrderRescue/1.0" } });
        if (!r.ok) { await sleep(1200); continue; }
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 1500) { await sleep(1200); continue; } // imagen vacía/placeholder
        await writeFile(path.join(OUT, slug + ".jpg"), buf);
        console.log(`✓ ${slug}  (${term})  ${(buf.length / 1024).toFixed(0)} KB`);
        done.push(slug);
        saved = true;
        break;
      } catch (e) {
        console.log(`… ${slug} (${term}) retry: ${e.message}`);
      }
      await sleep(1500); // respeta el rate limit de OFF
    }
    if (!saved) failed.push(slug);
    await sleep(1500);
  }
  console.log(`\nListo. ${done.length} ok, ${failed.length} sin imagen: ${failed.join(", ")}`);
}

main();
