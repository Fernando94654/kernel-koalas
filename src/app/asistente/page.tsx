"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Package, Repeat, MapPin, BarChart3, ArrowUp, type LucideIcon } from "lucide-react";

import { api } from "~/trpc/react";
import { RichText } from "~/components/RichText";
import { KoalaLogo } from "~/components/KoalaLogo";
import type { ChatMsg } from "~/server/chatbot";

const STORAGE_KEY = "orderRescueChat";
const NOMBRE = "Koko";

// Capacidades agrupadas — cada chip envía la pregunta al asistente.
const CAPACIDADES: { icon: LucideIcon; titulo: string; desc: string; prompts: string[] }[] = [
  {
    icon: Package,
    titulo: "Tus pedidos",
    desc: "Revisa si un pedido llegará completo.",
    prompts: [
      "¿Mi pedido llegará completo?",
      "¿Qué productos de mi pedido están en riesgo?",
    ],
  },
  {
    icon: Repeat,
    titulo: "Sustituciones",
    desc: "Con qué se reemplaza cada producto.",
    prompts: [
      "¿Con qué reemplazan la Coca-Cola?",
      "¿Qué productos se cambian más seguido?",
    ],
  },
  {
    icon: MapPin,
    titulo: "Zonas y bodegas",
    desc: "Dónde hay más riesgo de cambios.",
    prompts: [
      "¿Qué bodegas tienen más cambios?",
      "¿En qué países hay más sustituciones?",
    ],
  },
  {
    icon: BarChart3,
    titulo: "Resumen del negocio",
    desc: "Métricas y tendencias clave.",
    prompts: [
      "Dame un resumen ejecutivo del sistema",
      "¿Cuál es la tasa de sustitución general?",
    ],
  },
];

export default function AsistentePage() {
  const { data: session } = useSession();
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chat = api.chat.useMutation({
    onSuccess: (data) => {
      setHistory(data.history as ChatMsg[]);
      setProvider(data.provider);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.history));
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { setHistory(JSON.parse(saved) as ChatMsg[]); } catch { /* noop */ } }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, chat.isPending]);

  const send = (text: string) => {
    const msg = text.trim();
    if (!msg || chat.isPending) return;
    setInput("");
    chat.mutate({ message: msg, history });
  };

  const clear = () => {
    setHistory([]); setProvider(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const visible = history.filter((m) => m.role !== "system");
  const empty = visible.length === 0;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Asistente IA</h1>
          <p className="mt-1 text-[13px] text-muted">
            Pregunta en lenguaje natural sobre pedidos, sustituciones y riesgos del mercado.
          </p>
        </div>
        {!empty && (
          <button
            onClick={clear}
            className="btn-ghost shrink-0 !px-3 !py-2 text-[12px]"
          >
            Nueva conversación
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* ── Capacidades (panel lateral) ── */}
        <aside className="space-y-3">
          <div className="card !p-4">
            <div className="flex items-center gap-2.5">
              <AssistantAvatar size={40} />
              <div>
                <p className="text-[13px] font-bold text-ink">{NOMBRE} · Asistente</p>
                <p className="font-mono text-[10px] text-muted">
                  {provider ? `● ${provider}` : "Order Rescue · Arca Continental"}
                </p>
              </div>
            </div>
          </div>

          <p className="px-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
            ¿En qué te ayudo?
          </p>
          {CAPACIDADES.map((c) => (
            <div key={c.titulo} className="card !p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-rojo">
                  <c.icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{c.titulo}</p>
                  <p className="text-[11px] leading-snug text-muted">{c.desc}</p>
                </div>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {c.prompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="flex w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-[11px] text-ink transition-colors hover:border-rojo hover:text-rojo"
                  >
                    <span className="text-rojo">→</span>
                    <span className="min-w-0 truncate">{p}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* ── Conversación ── */}
        <section className="card flex h-[calc(100dvh-220px)] min-h-[480px] flex-col !p-0">
          {/* Mensajes */}
          <div ref={scrollRef} className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
            {empty && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <AssistantAvatar size={72} />
                <h2 className="mt-4 text-2xl font-extrabold text-ink">¡Hola! Soy {NOMBRE}</h2>
                <p className="mt-1 max-w-sm text-[13px] text-muted">
                  Tu copiloto de pedidos. Reviso si tu pedido llegará completo, te digo con qué
                  suelen reemplazar tus productos y dónde está el mayor riesgo. Elige una sugerencia o escríbeme.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {["¿Qué productos cambian más?", "Resumen ejecutivo", "¿Con qué reemplazan la Coca-Cola?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="pill text-[12px]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {visible.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} avatar={session?.user?.image ?? null} />
            ))}

            {chat.isPending && (
              <div className="flex items-end gap-2.5">
                <AssistantAvatar size={30} />
                <div className="rounded-2xl rounded-bl-md bg-surface px-4 py-3">
                  <span className="flex gap-1">
                    <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-1.5 focus-within:border-rojo">
              <textarea
                ref={inputRef}
                className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-[14px] text-ink outline-none placeholder:text-muted"
                placeholder="Escribe tu pregunta…"
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
              />
              <button
                className="btn flex shrink-0 items-center justify-center !rounded-xl !px-3 !py-2.5"
                onClick={() => send(input)}
                disabled={chat.isPending || !input.trim()}
                aria-label="Enviar"
              >
                <ArrowUp size={18} />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-center font-mono text-[10px] text-muted">
              Respuestas basadas en datos reales de Arca Continental · puede equivocarse
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Bubble({ role, content, avatar }: { role: string; content: string; avatar: string | null }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      {isUser ? (
        avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-7 w-7 shrink-0 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-card">Tú</span>
        )
      ) : (
        <AssistantAvatar size={30} />
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
          isUser
            ? "whitespace-pre-wrap rounded-br-md bg-rojo text-white"
            : "rounded-bl-md bg-surface text-ink"
        }`}
      >
        {isUser ? content : <RichText text={content} />}
      </div>
    </div>
  );
}

function AssistantAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <KoalaLogo size={size * 0.78} />
    </span>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-muted"
      style={{ animation: "chatdot 1s infinite", animationDelay: delay }}
    />
  );
}
