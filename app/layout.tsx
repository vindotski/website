import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { isProduction, siteUrl } from "@/lib/site";
import AnalyticsEvents from "./_components/AnalyticsEvents";
import VercelInsights from "./_components/VercelInsights";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // globals.css scrolls smoothly for in-page links; the attribute has Next
    // jump instantly on page changes instead of animating to the top
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        {children}
        <VercelInsights />
        {/* Reads the URL, which waits on pages with dynamic params */}
        <Suspense fallback={null}>
          <AnalyticsEvents />
        </Suspense>
      </body>
    </html>
  );
}
