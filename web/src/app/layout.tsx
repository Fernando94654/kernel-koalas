import "~/app/globals.css";

import { type Metadata, type Viewport } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { BottomNav } from "~/components/BottomNav";
import { ChatWidget } from "~/components/ChatWidget";
import { ServiceWorkerRegister } from "~/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Order Rescue",
  description: "Riesgo de sustitución de pedidos antes de que salgan del CEDIS · Arca Continental",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Order Rescue", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#e3001b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <TRPCReactProvider>
          <div className="phone">
            <header className="sticky top-0 z-30 flex items-center gap-2 bg-gradient-to-r from-rojo to-rojo-dark px-4 py-3 text-white shadow-card"
                    style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
              <span className="text-xl">🥤</span>
              <div className="leading-tight">
                <div className="font-extrabold tracking-tight">Order Rescue</div>
                <div className="text-[11px] opacity-85">Arca Continental</div>
              </div>
            </header>
            <main className="app-main">{children}</main>
            <ChatWidget />
            <BottomNav />
          </div>
          <ServiceWorkerRegister />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
