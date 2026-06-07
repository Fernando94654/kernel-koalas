import { Fragment } from "react";

// Render ligero de markdown básico para los mensajes del asistente:
// **negritas**, viñetas (- / •) y saltos de línea. Sin HTML arbitrario.
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const t = line.trim();
        const bullet = /^[-•]\s+/.test(t);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-[2px] shrink-0 text-rojo">•</span>
              <span>{inline(t.replace(/^[-•]\s+/, ""))}</span>
            </div>
          );
        }
        if (t === "") return <div key={i} className="h-1.5" />;
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
