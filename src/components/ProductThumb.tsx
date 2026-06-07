"use client";

import { useState } from "react";
import {
  CupSoda, GlassWater, Citrus, Zap, Milk, Leaf, Coffee, type LucideIcon,
} from "lucide-react";

import { categoriaBebida, imagenBebida, visualBebida, type BebidaCategoria } from "~/lib/producto";

// Ícono Lucide por categoría — usado como respaldo cuando no hay imagen real.
const ICONO: Record<BebidaCategoria, LucideIcon> = {
  cola: CupSoda,
  refresco: CupSoda,
  agua: GlassWater,
  jugo: Citrus,
  energia: Zap,
  lacteo: Milk,
  vegetal: Leaf,
  te: Coffee,
};

// Miniatura de bebida: muestra la foto real del producto (si existe) sobre un
// fondo tenue con el acento de su categoría; si la imagen falla, cae al ícono.
export function ProductThumb({
  nombre,
  size = 36,
}: {
  nombre: string;
  size?: number;
}) {
  const { tint } = visualBebida(nombre);
  const Icon = ICONO[categoriaBebida(nombre)];
  const src = imagenBebida(nombre);
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
      style={{
        width: size,
        height: size,
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
        <Icon size={size * 0.5} style={{ color: tint }} strokeWidth={2} />
      )}
    </span>
  );
}
