"use client";

import { signIn } from "next-auth/react";
import { ProductThumb } from "~/components/ProductThumb";

export default function LandingPage() {
  return (
    <div className="grid min-h-[100dvh] grid-cols-1 bg-card lg:grid-cols-2">
      {/* ── Columna izquierda: bienvenida + acceso ── */}
      <div className="flex flex-col justify-between px-6 py-10 sm:px-12 lg:px-16">
        {/* Marca */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-white shadow-fab"
            style={{ background: "linear-gradient(120deg, #C20000 0%, #8F0000 100%)" }}
          >
            🥤
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold tracking-tight text-ink">Order Rescue</div>
            <div className="font-mono text-[11px] text-muted">Arca Continental</div>
          </div>
        </div>

        {/* Centro: copy + CTA */}
        <div className="mx-auto w-full max-w-md py-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-rojo">
            Disponibilidad en tiempo real
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
            Anticipa las sustituciones antes de que salgan de la bodega.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Order Rescue revisa cada pedido y te avisa qué productos podrían llegar cambiados,
            con qué se suelen reemplazar y dónde está el mayor riesgo del mercado.
          </p>

          {/* Features */}
          <div className="mt-7 space-y-3">
            <Feature icon="🚦" title="Riesgo por pedido" desc="Ve línea por línea qué tan probable es una sustitución." />
            <Feature icon="📊" title="Alertas de mercado" desc="Tendencias de sustitución por región y producto." />
            <Feature icon="💬" title="Asistente IA" desc="Pregunta sobre CEDIS, SKUs y pedidos en lenguaje natural." />
          </div>

          {/* Sign-in */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-surface"
            style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
          >
            <GoogleIcon />
            Continuar con Google
          </button>
          <p className="mt-3 text-center text-[11px] text-muted">
            Al continuar aceptas el uso interno de Arca Continental.
          </p>
        </div>

        {/* Footer */}
        <p className="font-mono text-[10px] text-muted">Arca Continental · Order Rescue · Hackathon 2025</p>
      </div>

      {/* ── Columna derecha: showcase (solo desktop) ── */}
      <div className="relative hidden overflow-hidden lg:block" style={{ background: "linear-gradient(150deg, #C20000 0%, #8F0000 100%)" }}>
        {/* Patrón sutil */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex h-full items-center justify-center p-12">
          <PreviewCard />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-base">
        {icon}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <p className="text-[12px] text-muted">{desc}</p>
      </div>
    </div>
  );
}

// Tarjeta de muestra del producto — da contexto visual de la app.
function PreviewCard() {
  const rows = [
    { nombre: "Coca-Cola 600ml", unidades: 48, nivel: "ALTO", color: "#C20000" },
    { nombre: "Agua Ciel 1L", unidades: 120, nivel: "MEDIO", color: "#E8A317" },
    { nombre: "Powerade Ion4 500ml", unidades: 24, nivel: "BAJO", color: "#15924B" },
  ];
  return (
    <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-2xl">
      <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
        Líneas de Pedido
      </div>
      <div className="mb-4 text-[15px] font-extrabold tracking-tight text-ink">Pedido AC-882910</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.nombre}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card py-2.5 pr-3"
            style={{ borderLeft: `3px solid ${r.color}` }}
          >
            <span className="pl-2.5" />
            <ProductThumb nombre={r.nombre} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{r.nombre}</p>
              <span className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold" style={{ color: r.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
                RIESGO {r.nivel}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[14px] font-bold leading-none text-ink">{r.unidades}</p>
              <p className="mt-0.5 text-[9px] text-muted">Unidades</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
