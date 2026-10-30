import type { Metadata } from "next";
import styles from "./layout.module.css";

// Kept out of search results. Not blocked in robots.txt, or Google couldn't
// read this
export const metadata: Metadata = {
  robots: { index: false },
};

// Auth pages render bare: one narrow column in the middle of the screen
export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <main className={styles.auth}>
      <div className={styles.column}>{children}</div>
    </main>
  );
}
