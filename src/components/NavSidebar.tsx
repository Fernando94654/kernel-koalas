"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import { NAV_TABS } from "~/lib/nav";

export function NavSidebar() {
  const path = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="app-sidebar">

      {/* Brand anchor */}
      <div className="border-b px-5 py-5" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rojo text-lg text-white shadow-fab">
            🥤
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-ink">Order Rescue</div>
            <div className="text-[11px] text-muted">Arca Continental</div>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
          Menú
        </p>
        {NAV_TABS.map((tab) => {
          const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={active ? {
                background: "var(--color-nav-active-bg)",
                color: "var(--color-nav-active-text)",
              } : undefined}
              className={[
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                "transition-colors duration-150",
                active ? "font-semibold" : "text-muted hover:bg-surface hover:text-ink",
              ].join(" ")}
            >
              <span className={`text-base ${active ? "" : "opacity-60"}`}>{tab.icon}</span>
              {tab.label}
              {active && (
                <span
                  className="ml-auto h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--color-nav-active-text)" }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer — user profile */}
      <div className="border-t px-4 py-4" style={{ borderColor: "var(--color-border)" }}>
        {session?.user ? (
          <div className="flex items-center gap-2.5">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                className="h-8 w-8 shrink-0 rounded-full"
                alt="avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rojo text-xs font-bold text-white">
                {session.user.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-ink">
                {session.user.name ?? session.user.email}
              </p>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-[10px] text-muted transition-colors hover:text-rojo"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--rojo)" }}
          >
            Iniciar sesión
          </Link>
        )}
      </div>

    </nav>
  );
}
