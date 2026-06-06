import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rojo: { DEFAULT: "#e3001b", dark: "#b00016" },
        amarillo: "#f5a623",
        verde: "#2eae5b",
        ink: "#1d1f23",
        muted: "#6b7280",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
        fab: "0 6px 20px rgba(227,0,27,.4)",
      },
    },
  },
  plugins: [],
} satisfies Config;
