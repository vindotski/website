import type { Metadata } from "next";
import Footer from "./_components/Footer";
import Header from "./_components/Header";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Ivan Vinski · Software Engineer",
  description: "I build the part you see. And the parts you don't.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className={styles.content}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
