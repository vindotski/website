import Link from "next/link";
import Placeholder from "../../_components/Placeholder";
import styles from "./page.module.css";

const facts = ["Role", "Company", "Years", "Stack"];

export default function WorkTemplate() {
  return (
    <article className={styles.page}>
      <Link href="/#work" className={styles.back}>
        ← Work
      </Link>

      <header className={styles.intro}>
        <h1 className={styles.title}>Project name</h1>
        <Placeholder label="One-line summary" height={32} />
        <Placeholder label="Visit product ↗" height={24} />
      </header>

      <dl className={styles.facts}>
        {facts.map((fact) => (
          <div key={fact} className={styles.fact}>
            <dt>{fact}</dt>
            <dd>
              <Placeholder label="Value" height={24} />
            </dd>
          </div>
        ))}
      </dl>

      <Placeholder label="Hero image" height={420} />

      <aside className={styles.impact} aria-label="Impact">
        <p className={styles.impactLabel}>Impact</p>
        <Placeholder label="One or two lines on what it changed" height={72} />
      </aside>
    </article>
  );
}
