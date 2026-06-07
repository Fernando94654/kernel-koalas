import "~/app/globals.css";

import { type Metadata, type Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { SessionProviderWrapper } from "~/components/SessionProviderWrapper";
import { AppShell } from "~/components/AppShell";
import { ServiceWorkerRegister } from "~/components/ServiceWorkerRegister";

// Headline + body — geometric, friendly, on-brand for Arca Continental.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Labels, codes, numeric tags — monospaced for a clean, technical accent.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Order Rescue",
  description: "Substitution risk for orders before they leave the CEDIS · Arca Continental",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Order Rescue", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#C20000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${hanken.variable} ${jetbrains.variable}`}>
      <body>
        <SessionProviderWrapper>
        <TRPCReactProvider>
          <AppShell>{children}</AppShell>
          <ServiceWorkerRegister />
        </TRPCReactProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
