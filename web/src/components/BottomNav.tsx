"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Inicio", icon: "📊" },
  { href: "/semaforo", label: "Semáforo", icon: "🚦" },
  { href: "/pedido", label: "Pedido", icon: "🧾" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-gray-200 bg-white/95 backdrop-blur"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-3">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${active ? "text-rojo" : "text-muted"}`}>
              <span className={`text-xl ${active ? "" : "opacity-70 grayscale"}`}>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
