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
      {/* On top of the text on phones, fading into it; beside it from tablets
          up, where the wrapper steps aside */}
      <div className={styles.photo}>
        <Image
          src={portrait}
          alt="Ivan Vinski"
          placeholder="blur"
          sizes="(min-width: 900px) 380px, (min-width: 768px) 280px, 100vw"
          className={styles.portrait}
        />
      </div>
      <a href="#work" className={styles.cue}>
        See work
        <span className={styles.arrow} aria-hidden="true">
          ↓
        </span>
      </a>
    </section>
  );
}
