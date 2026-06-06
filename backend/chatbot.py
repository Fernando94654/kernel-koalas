"""
Chatbot analítico con LLM gratuito (Groq primario, Gemini fallback).

Patrón RAG liviano: en cada llamada se inyecta un contexto JSON (métricas precalculadas
relevantes a la pregunta) dentro del system prompt. Stateless: el frontend manda el
historial completo en cada request. Si no hay API keys, devuelve un mensaje amigable
(nunca rompe con 500).
"""
from __future__ import annotations

import json
import os
import re

import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

GROQ_MODEL = "llama-3.3-70b-versatile"
GEMINI_MODEL = "gemini-2.0-flash"


def build_system_prompt(contexto: dict) -> str:
    return f"""Eres un analista de operaciones de Arca Continental especializado en el
sistema Order Rescue. Tu rol es ayudar a supervisores de CEDIS, gerentes de operaciones
y equipos comerciales a entender los patrones de sustitución de pedidos.

Responde siempre en español, de forma clara y concisa. Cuando des números, sé preciso.
Si no tienes información suficiente para responder, dilo honestamente.

CONTEXTO ACTUAL DEL SISTEMA (datos reales):
{json.dumps(contexto, ensure_ascii=False, indent=2)}

GLOSARIO:
- CEDIS: Centro de Distribución
- Sustitución: cuando el producto pedido no está disponible y se reemplaza por otro
- Tasa de afectación: % de pedidos de un CEDIS que tuvieron al menos 1 sustitución
- Score de riesgo: probabilidad estimada de sustitución (0-1), verde <0.08, amarillo 0.08-0.14, rojo >0.14
- S1: señal por (CEDIS, SKU), S2: señal global por SKU, S3: señal por CEDIS

Sé útil, directo y orientado a acción. Cuando identifiques un problema, sugiere qué hacer."""


def get_context_for_query(query: str, app_state: dict) -> dict:
    """Router de contexto: según la pregunta decide qué datos inyectar."""
    q = query.lower()
    eda = app_state["eda"]
    contexto = {"metricas_globales": eda["metricas_globales"]}

    if any(w in q for w in ["cedis", "centro", "distribuc", "riesgo", "problema", "zona", "rojo"]):
        contexto["top_cedis_riesgosos"] = eda["top_cedis"][:10]

    if any(w in q for w in ["sku", "producto", "sustitu", "reemplaz", "coca", "topo", "ciel", "agua", "leche", "yogurt"]):
        contexto["top_skus_sustituidos"] = eda["top_skus_por_tasa"][:10]
        contexto["top_pares_sustitucion"] = eda["top_pares"][:10]

    if any(w in q for w in ["país", "pais", "méxico", "mexico", "ecuador", "perú", "peru", "argentina"]):
        contexto["por_pais"] = eda["por_pais"]

    # Detalle de pedido si menciona un ID largo
    match = re.search(r"\d{10,}", query.replace(".", "").replace(",", ""))
    if match:
        try:
            id_pedido = float(match.group())
            ps = app_state["scoring"].pedido_score.get(id_pedido)
            if ps:
                contexto["pedido_consultado"] = {"id_pedido": match.group(), **ps}
        except Exception:
            pass

    return contexto


async def call_llm(messages: list) -> tuple[str, str | None]:
    """
    Llama al LLM con fallback Groq -> Gemini.
    Devuelve (respuesta, proveedor_usado). proveedor_usado None si todo falló.
    """
    providers = [
        {"name": "Groq · llama-3.3-70b", "url": GROQ_URL, "model": GROQ_MODEL,
         "key": os.getenv("GROQ_API_KEY", "").strip()},
        {"name": "Gemini · 2.0-flash", "url": GEMINI_URL, "model": GEMINI_MODEL,
         "key": os.getenv("GEMINI_API_KEY", "").strip()},
    ]

    if not any(p["key"] for p in providers):
        return ("⚠️ El asistente de IA no está configurado todavía. Agrega tu GROQ_API_KEY "
                "o GEMINI_API_KEY al archivo .env y reinicia el servidor para activarlo. "
                "Mientras tanto, puedes usar los tableros del dashboard.", None)

    last_error = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for p in providers:
            if not p["key"]:
                continue
            try:
                resp = await client.post(
                    p["url"],
                    headers={"Authorization": f"Bearer {p['key']}",
                             "Content-Type": "application/json"},
                    json={"model": p["model"], "messages": messages,
                          "max_tokens": 800, "temperature": 0.3},
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"], p["name"]
            except httpx.HTTPStatusError as e:
                last_error = f"{p['name']}: HTTP {e.response.status_code}"
                continue
            except Exception as e:
                last_error = f"{p['name']}: {e}"
                continue

    return (f"Lo siento, no puedo conectarme al servicio de IA en este momento "
            f"({last_error}). Intenta de nuevo en unos segundos.", None)


async def chat(user_message: str, conversation_history: list, app_state: dict) -> tuple[str, list, str | None]:
    """Función principal del chatbot. Devuelve (respuesta, historial, proveedor)."""
    contexto = get_context_for_query(user_message, app_state)
    system_prompt = build_system_prompt(contexto)

    messages = [{"role": "system", "content": system_prompt}]
    messages += conversation_history[-6:]
    messages.append({"role": "user", "content": user_message})

    respuesta, proveedor = await call_llm(messages)

    conversation_history.append({"role": "user", "content": user_message})
    conversation_history.append({"role": "assistant", "content": respuesta})
    return respuesta, conversation_history, proveedor
