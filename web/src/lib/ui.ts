// Helpers de presentación compartidos por las pantallas (cliente).
import type { Nivel } from "~/lib/model";

export const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("es-MX");
export const pct1 = (x: number) => (x * 100).toFixed(1) + "%";

export const nivelEmoji: Record<Nivel, string> = { Rojo: "🔴", Amarillo: "🟡", Verde: "🟢" };

export const COLORS = {
  rojo: "#e3001b",
  amarillo: "#f5a623",
  verde: "#2eae5b",
  azul: "#2563eb",
  gris: "#9ca3af",
};

export const nivelColor: Record<Nivel, string> = {
  Rojo: COLORS.rojo,
  Amarillo: COLORS.amarillo,
  Verde: COLORS.verde,
};

export const truncate = (s: string, n = 28) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
