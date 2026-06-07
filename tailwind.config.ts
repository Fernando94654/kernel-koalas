import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  // "media" = automatically follows the OS dark/light preference
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        rojo:    { DEFAULT: "#CC0023", dark: "#9A001A", light: "#FF1A38" },
        amarillo: { DEFAULT: "#F5A623", light: "#FFC04D" },
        verde:   { DEFAULT: "#16A34A", light: "#22C55E" },
        // Semantic tokens backed by CSS vars — they flip automatically in dark mode
        ink:     "var(--color-ink)",
        muted:   "var(--color-muted)",
        surface: "var(--color-surface)",
        border:  "var(--color-border)",
        card:    "var(--color-card)",
      },
      boxShadow: {
        card:         "0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04)",
        "card-hover": "0 4px 16px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06)",
        fab:          "0 6px 20px rgba(204,0,35,.45)",
        sidebar:      "1px 0 0 #E5E8ED",
      },
    },
  },
  plugins: [],
} satisfies Config;
