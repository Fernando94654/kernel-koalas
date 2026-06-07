// Analytical chatbot: Groq primary -> Gemini fallback, lightweight RAG.
// Stateless. No API keys -> friendly message (never throws). Server-only.
import "server-only";

import { getEda, getPedidoScore, getSustitutos } from "~/server/data";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.0-flash";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function buildContext(query: string) {
  const q = query.toLowerCase();
  const eda = await getEda();

  // Siempre: lo más útil para un tendero + resumen del negocio (es barato).
  const ctx: Record<string, unknown> = {
    resumen_general: eda.metricas_globales,
    productos_con_mas_cambios: eda.top_skus_por_tasa.slice(0, 12),
    cambios_mas_frecuentes: eda.top_pares.slice(0, 12),
  };

  if (/bodega|zona|centro|riesgo|problema|rojo|amarillo|segur|cedis/.test(q))
    ctx.bodegas_con_mas_cambios = eda.top_cedis.slice(0, 10);

  if (/país|pais|méxico|mexico|ecuador|perú|peru|argentina|colombia|región|region/.test(q))
    ctx.por_pais = eda.por_pais;

  if (/vendido|popular|volumen|más vende|mas vende|demanda|top/.test(q))
    ctx.productos_mas_vendidos = eda.top_skus.slice(0, 12);

  if (/estado|entrega|entregad|cancelad|pendiente|status|complet/.test(q))
    ctx.estados_de_pedidos = eda.status_pedidos;

  if (/reciente|tendencia|último|ultimo|recientemente|ahora/.test(q))
    ctx.recencia = eda.recencia;

  // Productos mencionados por nombre → incluye sus reemplazos más probables.
  const candidatos = new Set<string>();
  for (const p of eda.top_skus_por_tasa) candidatos.add(p.sku);
  for (const p of eda.top_pares) { candidatos.add(p.origen); candidatos.add(p.destino); }
  const mencionados = [...candidatos].filter((nombre) => {
    const primeras = nombre.toLowerCase().split(/[\s,]+/).slice(0, 2).join(" ");
    return primeras.length > 3 && q.includes(primeras);
  }).slice(0, 3);
  if (mencionados.length) {
    ctx.reemplazos_de_productos_mencionados = await Promise.all(
      mencionados.map(async (sku) => ({ producto: sku, reemplazos: await getSustitutos(sku, 3) })),
    );
  }

  // If query contains an order ID, fetch its score
  const m = query.replace(/[.,]/g, "").match(/\d{10,}/);
  if (m) {
    const ps = await getPedidoScore(m[0]!);
    if (ps) ctx.pedido_consultado = { id_pedido: m[0], ...ps };
  }
  return ctx;
}

function systemPrompt(ctx: Record<string, unknown>): string {
  return `Eres el asistente de Order Rescue, una app que ayuda a dueños de tienda, restaurantes y negocios a saber si sus pedidos de bebidas y productos Arca Continental llegarán completos.

Habla de forma amigable, simple y en español. Evita términos técnicos — usa "bodega" en vez de CEDIS, "producto" en vez de SKU, "cambio" o "reemplazo" en vez de "sustitución". El usuario es un tendero o dueño de negocio, no un técnico.

Puedes ayudar con:
- ¿Mi producto va a llegar o lo van a cambiar? (si dan un número de pedido)
- ¿Por qué producto me lo reemplazarían? ¿Cuál es el mejor sustituto?
- ¿Qué productos tienen más probabilidad de cambio? ¿Cuáles son los más vendidos?
- ¿Qué bodegas o países tienen más cambios?
- Comparar dos productos por riesgo de cambio.
- Recomendar qué conviene tener en stock para no quedarse corto.
- Dar un resumen ejecutivo del negocio (volumen, % de cambios, tendencias).

Cuando el riesgo de cambio es alto, tranquiliza al cliente y dile qué producto alternativo suele llegar en su lugar. Cuando todo está bien, confírmalo con seguridad. Si te piden una recomendación, sé concreto y accionable.

DATOS REALES DEL SISTEMA (úsalos para responder con precisión; no inventes cifras):
${JSON.stringify(ctx, null, 2)}

Reglas de formato y estilo:
- Nunca menciones términos como "score", "S1/S2/S3", "tasa de afectación" ni "CEDIS" — usa lenguaje cotidiano ("bodega", "producto", "cambio").
- Usa **negritas** en los números o nombres clave, y listas con viñetas cuando ayuden a leer.
- Si no tienes datos suficientes, dilo con amabilidad y sugiere usar el simulador de pedidos o dar el número de pedido.
- Respuestas cortas y directas (3-5 oraciones), salvo que pidan un análisis o resumen más amplio.`;
}

async function callLLM(messages: ChatMsg[]): Promise<{ text: string; provider: string | null }> {
  const providers = [
    { name: "Groq · llama-3.3-70b", url: GROQ_URL, model: GROQ_MODEL, key: (process.env.GROQ_API_KEY ?? "").trim() },
    { name: "Gemini · 2.0-flash", url: GEMINI_URL, model: GEMINI_MODEL, key: (process.env.GEMINI_API_KEY ?? "").trim() },
  ];

  if (!providers.some((p) => p.key)) {
    return {
      text: "⚠️ El asistente de IA no está configurado todavía. Agrega tu GROQ_API_KEY o GEMINI_API_KEY al archivo .env y reinicia el servidor para activarlo. Mientras tanto, puedes usar los tableros del dashboard.",
      provider: null,
    };
  }

  let lastError = "";
  for (const p of providers) {
    if (!p.key) continue;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const resp = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: p.model, messages, max_tokens: 800, temperature: 0.3 }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) { lastError = `${p.name}: HTTP ${resp.status}`; continue; }
      const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (text) return { text, provider: p.name };
      lastError = `${p.name}: empty response`;
    } catch (e) {
      lastError = `${p.name}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  return { text: `Lo siento, no puedo conectarme al servicio de IA en este momento (${lastError}). Intenta de nuevo en unos segundos.`, provider: null };
}

export async function chat(userMessage: string, history: ChatMsg[]) {
  const ctx = await buildContext(userMessage);
  const messages: ChatMsg[] = [
    { role: "system", content: systemPrompt(ctx) },
    ...history.slice(-6),
    { role: "user", content: userMessage },
  ];
  const { text, provider } = await callLLM(messages);
  const newHistory: ChatMsg[] = [
    ...history,
    { role: "user", content: userMessage },
    { role: "assistant", content: text },
  ];
  return { response: text, history: newHistory, provider };
}
