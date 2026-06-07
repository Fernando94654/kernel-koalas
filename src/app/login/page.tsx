"use client";

import { signIn } from "next-auth/react";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-card px-6 text-center">
      {/* Acento sutil de marca en el fondo */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "radial-gradient(circle, #C20000 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white p-4 shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arca-logo.png" alt="Arca Continental" className="h-full w-full object-contain" />
        </div>

        {/* Nombre de la app */}
        <h1 className="text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">
          Order Rescue
        </h1>
        <p className="mt-2 font-mono text-[12px] font-semibold uppercase tracking-[0.25em] text-rojo">
          Arca Continental
        </p>

        <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-muted">
          Anticipa qué productos de tu pedido podrían venir sustituidos, antes de que salgan de la bodega.
        </p>

        {/* Iniciar sesión con Google */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-surface"
          style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
        >
          <GoogleIcon />
          Iniciar sesión con Google
        </button>

        <p className="mt-4 text-[11px] text-muted">
          Acceso interno · Arca Continental
        </p>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 font-mono text-[10px] text-muted">
        Order Rescue · Hackathon 2025
      </p>
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
