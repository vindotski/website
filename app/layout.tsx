import type { Metadata } from "next";
import Header from "./_components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ivan Vinski · Software Engineer",
  description: "I build the part you see. And the parts you don't.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
