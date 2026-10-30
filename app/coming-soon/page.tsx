import type { Metadata } from "next";
import { getHero } from "@/lib/api";
import styles from "./page.module.css";

// Signed-out visitors see this at every URL until launch, so it stays out of
// search results
export const metadata: Metadata = {
  title: "Ivan Vinski · Software Engineer",
  description: "I build the part you see. And the parts you don't.",
  robots: { index: false },
};

// Shown by the auth guard in place of every page until launch
export default async function ComingSoonPage() {
  const hero = await getHero();

  return (
    <main className={styles.comingSoon} aria-label="Coming soon">
      <p className={styles.eyebrow}>Coming soon</p>
      <h1 className={styles.headline}>{hero.headline}</h1>
    </main>
  );
}
