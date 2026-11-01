import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { isProduction, siteUrl } from "@/config/site";
import { sessionCookie } from "@/lib/signed-in-cookie";
import AdminBarLoader from "./_components/admin-bar-loader";
import AnalyticsEvents from "./_components/analytics-events";
import VercelInsights from "./_components/vercel-insights";
import AppProvider from "./provider";
import "./globals.css";

// Self-hosted at build time; exposed as CSS variables used in globals.css
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Pages set only their own name; the template adds the rest
  title: {
    default: "Ivan Vinski · Product Engineer",
    template: "%s · Ivan Vinski",
  },
  description: "Frontend by trade, full-stack by habit, product by focus.",
  // No canonical or og:url here: every page would inherit them and point at /
  openGraph: {
    type: "website",
    siteName: "Ivan Vinski",
  },
  robots: isProduction
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

// Runs before the first paint, so a signed-in page lays out with room for the
// admin toolbar from the start (see globals.css)
const markSignedIn = `if (${sessionCookie}.test(document.cookie)) document.documentElement.setAttribute("data-signed-in", "")`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // globals.css scrolls smoothly for in-page links; the attribute has Next
    // jump instantly on page changes instead of animating to the top.
    // data-signed-in is added before React hydrates, hence the warning off
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: markSignedIn }} />
      </head>
      <body>
        <AppProvider>
          {children}
          {/* Reads the URL, like AnalyticsEvents */}
          <Suspense fallback={null}>
            <AdminBarLoader />
          </Suspense>
        </AppProvider>
        <VercelInsights />
        {/* Reads the URL, which waits on pages with dynamic params */}
        <Suspense fallback={null}>
          <AnalyticsEvents />
        </Suspense>
      </body>
    </html>
  );
}
