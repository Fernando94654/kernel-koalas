"use client";

import { useState } from "react";
import { imagenBebida, visualBebida } from "~/lib/producto";

// Miniatura de bebida: muestra la foto real del producto (si existe) sobre un
// fondo tenue con el acento de su categoría; si la imagen falla, cae al ícono.
export function ProductThumb({
  nombre,
  size = 36,
}: {
  nombre: string;
  size?: number;
}) {
  const { glyph, tint } = visualBebida(nombre);
  const src = imagenBebida(nombre);
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `${tint}12`,
        border: `1px solid ${tint}26`,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: "82%", height: "82%", objectFit: "contain" }}
        />
      ) : (
        glyph
      )}
    </span>
  );
}
