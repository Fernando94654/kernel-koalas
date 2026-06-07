import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  // "class" = nunca sigue el modo oscuro del SO; la app queda siempre en claro.
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        rojo:    { DEFAULT: "#C20000", dark: "#8F0000", light: "#E11A1A" },
        amarillo: { DEFAULT: "#E8A317", light: "#F5BE4B" },
        verde:   { DEFAULT: "#15924B", light: "#22C55E" },
        // Semantic tokens backed by CSS vars — they flip automatically in dark mode
        ink:     "var(--color-ink)",
        muted:   "var(--color-muted)",
        surface: "var(--color-surface)",
        border:  "var(--color-border)",
        card:    "var(--color-card)",
      },
      boxShadow: {
        card:         "0 1px 2px rgba(16,16,24,.04), 0 1px 3px rgba(16,16,24,.05)",
        "card-hover": "0 6px 24px rgba(16,16,24,.08), 0 2px 8px rgba(16,16,24,.05)",
        fab:          "0 8px 24px rgba(194,0,0,.38)",
        sidebar:      "1px 0 0 #E5E8ED",
      },
    },
  },
  plugins: [],
} satisfies Config;
