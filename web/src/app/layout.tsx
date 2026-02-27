import type { Metadata, Viewport } from "next";
import { Inter, Roboto } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { plPL } from "@clerk/localizations";
import Script from "next/script";
import CookieBanner from "./components/CookieBanner";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import PostHogTracker from "./components/PostHogTracker";
import { headers } from "next/headers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#06060b",
};

export const metadata: Metadata = {
  title: "Lilapu — Twój prywatny asystent AI",
  description:
    "Privacy-first transkrypcja audio i inteligentny czat z notatkami. Twoje dane, Twój serwer.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lilapu",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html lang="pl" className="dark">
      <body className={`${inter.variable} ${roboto.variable}`}>
        <ClerkProvider
          localization={{
            ...plPL,
            waitlist: {
              ...plPL.waitlist,
              success: {
                ...plPL.waitlist?.success,
                subtitle: "Skontaktujemy się z Tobą, gdy aplikacja będzie gotowa do testowania.",
                message: "",
              },
            },
          }}
          waitlistUrl="/waitlist"
          taskUrls={{ 'setup-mfa': '/setup-mfa' }}
        >
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Suspense fallback={null}>
            <PostHogTracker />
          </Suspense>
        </ClerkProvider>
        <CookieBanner />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          nonce={nonce}
        >{`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(() => {}); }`}</Script>
        <Analytics />
      </body>
    </html>
  );
}
