import "~/app/globals.css";

import { type Metadata, type Viewport } from "next";
import { Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { BottomNav } from "~/components/BottomNav";
import { NavSidebar } from "~/components/NavSidebar";
import { ChatWidget } from "~/components/ChatWidget";
import { ServiceWorkerRegister } from "~/components/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Order Rescue",
  description: "Substitution risk for orders before they leave the CEDIS · Arca Continental",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Order Rescue", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#CC0023",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <TRPCReactProvider>
          <div className="app-shell">

            {/* ── Full-width sticky header ── */}
            <header className="app-header">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl backdrop-blur-sm">
                🥤
              </div>
              <div className="flex-1 leading-tight">
                <div className="font-extrabold tracking-tight">Order Rescue</div>
                <div className="text-[11px] opacity-80">Arca Continental</div>
              </div>
              {/* Desktop tagline */}
              <p className="hidden text-xs font-medium opacity-70 md:block">
                Substitution Risk · Real-time
              </p>
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
          <ServiceWorkerRegister />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
