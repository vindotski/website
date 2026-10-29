import Image from "next/image";
import { getHero } from "@/lib/api";
import portrait from "@/public/images/portrait.jpg";
import ContactActions from "./ContactActions";
import styles from "./Hero.module.css";

export default async function Hero() {
  const hero = await getHero();

  return (
    <section className={styles.hero} aria-label="Introduction">
      <div className={styles.text}>
        <p className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          {hero.availability}
        </p>
        <h1 className={styles.headline}>{hero.headline}</h1>
        <div className={styles.actions}>
          <ContactActions tone="light" />
        </div>
      </div>
      {/* Wide screens only; phones see the portrait in About */}
      <Image
        src={portrait}
        alt="Ivan Vinski"
        placeholder="blur"
        sizes="380px"
        className={styles.portrait}
      />
      <a href="#work" className={styles.cue}>
        See work
        <span className={styles.arrow} aria-hidden="true">
          ↓
        </span>
      </a>
    </section>
  );
}
