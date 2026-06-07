"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-sm text-center">
        {/* Logo */}
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-fab"
          style={{ background: "linear-gradient(120deg, #C20000 0%, #8F0000 100%)" }}
        >
          🥤
        </div>

        <h1 className="mb-1 text-xl font-extrabold tracking-tight text-ink">Order Rescue</h1>
        <p className="mb-6 text-xs text-muted">
          Verifica que tus pedidos lleguen completos antes de salir de la bodega.
        </p>

        {/* Google sign-in button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface"
          style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        <p className="mt-6 text-[10px] text-muted">Arca Continental · Hackathon 2025</p>
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
