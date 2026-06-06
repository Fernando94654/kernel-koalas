"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "~/trpc/react";
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
      {/* FAB dentro de la columna del teléfono */}
      <div className="pointer-events-none fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2">
        <button onClick={() => setOpen(true)}
          className="pointer-events-auto absolute bottom-[84px] right-4 flex h-14 w-14 items-center justify-center rounded-full bg-rojo text-2xl text-white shadow-fab active:scale-95"
          aria-label="Abrir asistente IA">
          💬
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative flex h-[88dvh] w-full max-w-[480px] flex-col self-end rounded-t-3xl bg-white shadow-2xl"
               onClick={(e) => e.stopPropagation()}>
            {/* head */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <div className="font-bold">🤖 Asistente IA</div>
                <div className="text-[11px] text-muted">{provider ?? "Order Rescue"}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clear} className="text-xs text-muted">Limpiar</button>
                <button onClick={() => setOpen(false)} className="text-2xl leading-none text-muted">×</button>
              </div>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto p-4">
              {visible.length === 0 && (
                <div className="text-sm text-muted">
                  ¡Hola! Pregúntame sobre CEDIS, SKUs o pedidos. Prueba una sugerencia 👇
                </div>
              )}
              {visible.map((m, i) => (
                <div key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === "user" ? "ml-auto rounded-br-md bg-rojo text-white" : "mr-auto rounded-bl-md bg-gray-100"
                  }`}>
                  {m.content}
                </div>
              ))}
              {chat.isPending && (
                <div className="mr-auto rounded-2xl rounded-bl-md bg-gray-100 px-3.5 py-2 text-sm text-muted">
                  <span className="spinner" /> Analizando datos…
                </div>
              )}
            </div>

            {/* quick chips */}
            {visible.length === 0 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)}
                    className="shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs active:bg-gray-100">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* input */}
            <div className="flex gap-2 border-t border-gray-200 p-3"
                 style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
              <input className="input" placeholder="Escribe tu pregunta…" value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => e.key === "Enter" && send(input)} />
              <button className="btn shrink-0" onClick={() => send(input)} disabled={chat.isPending}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
