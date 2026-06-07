"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_TABS } from "~/lib/nav";

export function NavSidebar() {
  const path = usePathname();

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

      {/* Footer */}
      <div className="border-t px-6 py-4" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-[11px] text-muted">Hackathon · 2025</p>
        <p className="text-[11px] text-muted opacity-70">Kernel Koalas</p>
      </div>

    </nav>
  );
}
