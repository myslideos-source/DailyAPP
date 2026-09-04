import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AppStoreProvider } from "@/lib/store/app-store";
import { SplashProvider } from "@/lib/store/splash-context";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "dayli — Euer Tag, gemeinsam geplant",
  description:
    "Der private Familienkalender von Domenico und Elisabeth: Termine, Aufgaben, gemeinsame Zeit und Sparziele an einem warmen, ruhigen Ort.",
  applicationName: "dayli",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "dayli",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#080A13",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${manrope.variable} h-full`}>
      <body className="min-h-full">
        <ServiceWorkerRegister />
        <AppStoreProvider>
          <SplashProvider>
            <AppShell>{children}</AppShell>
          </SplashProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
