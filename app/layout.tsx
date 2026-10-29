import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import FloatingContact from "./_components/FloatingContact";
import Footer from "./_components/Footer";
import Header from "./_components/Header";
import "./globals.css";
import styles from "./layout.module.css";

// Self-hosted at build time; exposed as CSS variables used in globals.css
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Ivan Vinski · Software Engineer",
  description: "I build the part you see. And the parts you don't.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <Header />
        <main className={styles.content}>{children}</main>
        <Footer />
        {/* Reads the URL, which waits on pages with dynamic params */}
        <Suspense fallback={null}>
          <FloatingContact />
        </Suspense>
      </body>
    </html>
  );
}
