"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_TABS } from "~/lib/nav";

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav">
      <div className="grid grid-cols-3">
        {NAV_TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "" : "text-muted"
              }`}
              style={active ? { color: "var(--color-nav-active-text)" } : undefined}
            >
              <span className={`text-xl ${active ? "" : "opacity-60 grayscale"}`}>
                {t.icon}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
