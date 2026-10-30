import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { isProduction, siteUrl } from "@/lib/site";
import "./globals.css";

// Self-hosted at build time; exposed as CSS variables used in globals.css
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Ivan Vinski · Software Engineer",
  description: "I build the part you see. And the parts you don't.",
  metadataBase: new URL(siteUrl),
  // No canonical or og:url here: every page would inherit them and point at /
  openGraph: { type: "website", siteName: "Ivan Vinski" },
  robots: isProduction
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
