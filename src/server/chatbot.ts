// Analytical chatbot: Groq primary -> Gemini fallback, lightweight RAG.
// Stateless. No API keys -> friendly message (never throws). Server-only.
import "server-only";

import { getEda, getPedidoScore } from "~/server/data";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.0-flash";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function buildContext(query: string) {
  const q = query.toLowerCase();
  const eda = await getEda();
  const ctx: Record<string, unknown> = { metricas_globales: eda.metricas_globales };

  if (/cedis|centro|distribuc|riesgo|problema|zona|rojo/.test(q))
    ctx.top_cedis_riesgosos = eda.top_cedis.slice(0, 10);
  if (/sku|producto|sustitu|reemplaz|coca|topo|ciel|agua|leche|yogurt/.test(q)) {
    ctx.top_skus_sustituidos = eda.top_skus_por_tasa.slice(0, 10);
    ctx.top_pares_sustitucion = eda.top_pares.slice(0, 10);
  }
  if (/país|pais|méxico|mexico|ecuador|perú|peru|argentina/.test(q))
    ctx.por_pais = eda.por_pais;

  const m = query.replace(/[.,]/g, "").match(/\d{10,}/);
  if (m) {
    const ps = await getPedidoScore(m[0]!);
    if (ps) ctx.pedido_consultado = { id_pedido: m[0], ...ps };
  }
  return ctx;
}

function systemPrompt(ctx: Record<string, unknown>): string {
  return `Eres un analista de operaciones de Arca Continental especializado en el sistema Order Rescue. Tu rol es ayudar a supervisores de CEDIS, gerentes de operaciones y equipos comerciales a entender los patrones de sustitución de pedidos.

Responde siempre en español, de forma clara y concisa. Cuando des números, sé preciso. Si no tienes información suficiente para responder, dilo honestamente.

CONTEXTO ACTUAL DEL SISTEMA (datos reales):
${JSON.stringify(ctx, null, 2)}

GLOSARIO:
- CEDIS: Centro de Distribución
- Sustitución: cuando el producto pedido no está disponible y se reemplaza por otro
- Tasa de afectación: % de pedidos de un CEDIS que tuvieron al menos 1 sustitución
- Score de riesgo: probabilidad estimada de sustitución (0-1), verde <0.08, amarillo 0.08-0.14, rojo >0.14
- S1: señal por (CEDIS, SKU), S2: señal global por SKU, S3: señal por CEDIS

Sé útil, directo y orientado a acción. Cuando identifiques un problema, sugiere qué hacer.`;
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
