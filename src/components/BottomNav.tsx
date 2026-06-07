"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import { NAV_TABS } from "~/lib/nav";

export function BottomNav() {
  const path = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="bottom-nav">
      <div className={`grid grid-cols-${NAV_TABS.length + 1}`}>
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

        {/* Auth tab */}
        {session?.user ? (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted"
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                className="h-6 w-6 rounded-full"
                alt="avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-xl">👤</span>
            )}
            Salir
          </button>
        ) : (
          <Link
            href="/login"
            className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted"
          >
            <span className="text-xl opacity-60">🔑</span>
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
}
