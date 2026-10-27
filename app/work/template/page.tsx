import Link from "next/link";
import Placeholder from "../../_components/Placeholder";
import styles from "./page.module.css";

const facts = ["Role", "Company", "Years", "Stack"];
const highlights = ["Highlight 1", "Highlight 2", "Highlight 3"];

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

      <div className={styles.body}>
        <section className={styles.block}>
          <h2>Context</h2>
          <Placeholder label="The product, its users, the problem" height={120} />
        </section>

        <section className={styles.block}>
          <h2>My role</h2>
          <Placeholder label="What I owned, the team around me" height={96} />
        </section>

        <section className={styles.block}>
          <h2>What I built</h2>
          {highlights.map((highlight) => (
            <div key={highlight} className={styles.highlight}>
              <h3>{highlight}</h3>
              <Placeholder label="What and why" height={72} />
              <Placeholder label="Image" height={280} />
            </div>
          ))}
        </section>

        <section className={styles.block}>
          <h2>Outcome</h2>
          <Placeholder label="What it changed" height={96} />
        </section>
      </div>
    </article>
  );
}
