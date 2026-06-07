"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { api } from "~/trpc/react";
import { RichText } from "~/components/RichText";
import { KoalaLogo } from "~/components/KoalaLogo";
import type { ChatMsg } from "~/server/chatbot";

const QUICK = [
  "¿Cuáles son los CEDIS en zona roja?",
  "¿Qué producto se sustituye más?",
  "Dame un resumen ejecutivo del sistema",
  "¿Cuáles son los sustitutos de Coca - Cola?",
  "¿En qué países hay más sustituciones?",
];

const STORAGE_KEY = "orderRescueChat";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, open, chat.isPending]);

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

  return (
    <>
      {/* Floating action button */}
      <div className="pointer-events-none fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2">
        <button
          onClick={() => setOpen(true)}
          className="pointer-events-auto absolute right-4 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-fab transition-transform active:scale-95"
          style={{ bottom: "var(--chat-fab-bottom)", background: "linear-gradient(120deg, #C20000 0%, #8F0000 100%)" }}
          aria-label="Abrir asistente Koko"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
            <KoalaLogo size={28} />
          </span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative flex h-[88dvh] w-full max-w-[480px] flex-col self-end rounded-t-3xl shadow-2xl md:max-w-[520px]"
            style={{ background: "var(--color-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
                  <KoalaLogo size={26} />
                </div>
                <div>
                  <div className="font-bold text-ink">Koko</div>
                  <div className="text-[11px] text-muted">{provider ?? "Asistente · Order Rescue"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/asistente"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:text-rojo"
                >
                  Pantalla completa ↗
                </Link>
                <button onClick={clear} className="text-xs font-medium text-muted hover:text-ink">
                  Clear
                </button>
                <button onClick={() => setOpen(false)} className="text-xl leading-none text-muted hover:text-ink">
                  ×
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto p-4">
              {visible.length === 0 && (
                <div className="text-sm text-muted">
                  ¡Hola! Soy <span className="font-semibold text-ink">Koko</span>. Pregúntame sobre tus pedidos,
                  productos o riesgos de cambio. Prueba una sugerencia:
                </div>
              )}
              {visible.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto whitespace-pre-wrap rounded-br-md bg-rojo text-white"
                      : "mr-auto rounded-bl-md text-ink"
                  }`}
                  style={m.role !== "user" ? { background: "var(--color-surface)" } : undefined}
                >
                  {m.role === "user" ? m.content : <RichText text={m.content} />}
                </div>
              ))}
              {chat.isPending && (
                <div
                  className="mr-auto rounded-2xl rounded-bl-md px-3.5 py-2 text-sm text-muted"
                  style={{ background: "var(--color-surface)" }}
                >
                  <span className="spinner" /> Analyzing data…
                </div>
              )}
            </div>

            {/* Quick suggestion chips */}
            {visible.length === 0 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
                    style={{ border: "1px solid var(--color-border)" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div
              className="flex gap-2 p-3"
              style={{
                borderTop: "1px solid var(--color-border)",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
              }}
            >
              <input
                className="input"
                placeholder="Escribe tu pregunta…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
              />
              <button className="btn shrink-0" onClick={() => send(input)} disabled={chat.isPending}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
