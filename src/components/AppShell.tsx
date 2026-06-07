"use client";

import { usePathname } from "next/navigation";

import { BottomNav } from "~/components/BottomNav";
import { NavSidebar } from "~/components/NavSidebar";
import { ChatWidget } from "~/components/ChatWidget";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const bare = path === "/login";

  if (bare) {
    return <main className="min-h-[100dvh]">{children}</main>;
  }

  return (
    <div className="app-shell">
      {/* ── Full-width sticky header ── */}
      <header className="app-header">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arca-logo.png" alt="Arca Continental" className="h-full w-full object-contain" />
        </div>
        <div className="flex-1 leading-tight">
          <div className="font-extrabold tracking-tight">Order Rescue</div>
          <div className="text-[11px] opacity-80">Arca Continental</div>
        </div>
      </header>

      {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
      <NavSidebar />

      {/* ── Page content ── */}
      <main className="app-main">{children}</main>

      <ChatWidget />

      {/* ── Bottom nav: mobile only ── */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
